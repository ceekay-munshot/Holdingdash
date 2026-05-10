import type { OwnershipQuarter } from '../types'

const QUARTERS: string[] = (() => {
  const out: string[] = []
  // FY21 Q1 ... FY25 Q4 -> 20 quarters
  for (let fy = 21; fy <= 25; fy++) {
    for (let q = 1; q <= 4; q++) {
      out.push(`Q${q} FY${fy}`)
    }
  }
  return out
})()

interface Profile {
  promoter: number
  fii: number
  dii: number
  // public is derived
  // drift per quarter
  promoterDrift: number
  fiiDrift: number
  diiDrift: number
  // amplitude of noise
  noise: number
}

const profiles: Record<string, Profile> = {
  'RELIANCE.NS': { promoter: 50.5, fii: 22.0, dii: 14.5, promoterDrift: 0.02, fiiDrift: 0.05, diiDrift: 0.18, noise: 0.18 },
  'HDFCBANK.NS': { promoter: 25.6, fii: 51.2, dii: 16.4, promoterDrift: -0.05, fiiDrift: -0.18, diiDrift: 0.22, noise: 0.22 },
  'INFY.NS': { promoter: 14.7, fii: 33.6, dii: 18.0, promoterDrift: -0.04, fiiDrift: -0.12, diiDrift: 0.24, noise: 0.20 },
  'TCS.NS': { promoter: 72.3, fii: 12.8, dii: 9.4, promoterDrift: 0.0, fiiDrift: -0.08, diiDrift: 0.14, noise: 0.14 },
  'LT.NS': { promoter: 0.0, fii: 24.5, dii: 38.5, promoterDrift: 0.0, fiiDrift: -0.05, diiDrift: 0.18, noise: 0.18 },
  'DMART.NS': { promoter: 74.6, fii: 9.4, dii: 7.5, promoterDrift: -0.02, fiiDrift: 0.10, diiDrift: 0.16, noise: 0.16 },
  'TITAN.NS': { promoter: 52.9, fii: 17.8, dii: 11.0, promoterDrift: 0.0, fiiDrift: -0.06, diiDrift: 0.18, noise: 0.16 },
  'BAJFINANCE.NS': { promoter: 54.7, fii: 20.4, dii: 13.2, promoterDrift: -0.03, fiiDrift: -0.14, diiDrift: 0.22, noise: 0.22 },
  'ASIANPAINT.NS': { promoter: 52.6, fii: 18.5, dii: 11.4, promoterDrift: 0.0, fiiDrift: -0.16, diiDrift: 0.20, noise: 0.20 },
  'MARUTI.NS': { promoter: 58.1, fii: 19.4, dii: 14.8, promoterDrift: 0.0, fiiDrift: -0.10, diiDrift: 0.18, noise: 0.18 },
}

// Deterministic pseudo-random based on string + index so charts stay stable
function seeded(seed: string, i: number): number {
  let h = 0
  for (let c = 0; c < seed.length; c++) h = (h * 31 + seed.charCodeAt(c)) | 0
  const x = Math.sin((h + i) * 9301 + 49297) * 233280
  return x - Math.floor(x) // 0..1
}

/**
 * Synthesise a plausible ownership profile from a ticker. Used when the
 * ticker isn't in our hand-curated `profiles` dict — keeps every NSE-listed
 * company looking distinct on the dashboard.
 */
function profileFromTicker(ticker: string): Profile {
  const r = (i: number) => seeded(ticker + 'prof', i)
  // pick a promoter level: most Indian companies sit 35-65%
  const promoter = +(35 + r(0) * 30).toFixed(2)
  // FII share usually 5-30%
  const fii = +(5 + r(1) * 22).toFixed(2)
  // DII share usually 5-25%
  const dii = +(5 + r(2) * 18).toFixed(2)
  // drift can be small, biased toward DII accumulation
  return {
    promoter,
    fii,
    dii,
    promoterDrift: (r(3) - 0.5) * 0.06,
    fiiDrift: (r(4) - 0.55) * 0.25,
    diiDrift: 0.05 + r(5) * 0.25,
    noise: 0.15 + r(6) * 0.12,
  }
}

export function getOwnership20q(ticker: string): OwnershipQuarter[] {
  const p = profiles[ticker] ?? profileFromTicker(ticker)
  return QUARTERS.map((quarter, i) => {
    const noise = (seeded(ticker, i) - 0.5) * 2 * p.noise
    const noise2 = (seeded(ticker + 'b', i) - 0.5) * 2 * p.noise
    const noise3 = (seeded(ticker + 'c', i) - 0.5) * 2 * p.noise
    let promoter = +(p.promoter + p.promoterDrift * i + noise * 0.3).toFixed(2)
    let fii = +(p.fii + p.fiiDrift * i + noise2).toFixed(2)
    let dii = +(p.dii + p.diiDrift * i + noise3).toFixed(2)
    if (promoter < 0) promoter = 0
    if (fii < 0) fii = 0
    if (dii < 0) dii = 0
    let pub = +(100 - promoter - fii - dii).toFixed(2)
    if (pub < 0) {
      // rebalance
      const over = -pub
      pub = 0
      fii = +(fii - over).toFixed(2)
    }
    return { quarter, promoter, fii, dii, public: pub }
  })
}
