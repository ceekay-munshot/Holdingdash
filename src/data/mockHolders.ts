import type {
  BreadthPoint,
  HeatmapCell,
  HeatmapRow,
  HolderRow,
  HolderType,
  OwnershipTrendsData,
  OwnershipTrendsStory,
} from '../types'
import { getOwnership20q } from './mockOwnership'

/* ===== holder universe ===== */

interface HolderTemplate {
  name: string
  type: HolderType
}

const FII_POOL: HolderTemplate[] = [
  { name: 'Vanguard Group', type: 'FII' },
  { name: 'BlackRock', type: 'FII' },
  { name: 'Capital Group', type: 'FII' },
  { name: 'Norges Bank', type: 'FII' },
  { name: 'GQG Partners', type: 'FII' },
  { name: 'Government of Singapore', type: 'FII' },
  { name: 'Fidelity', type: 'FII' },
  { name: 'JPMorgan AM', type: 'FII' },
  { name: 'Schroders', type: 'FII' },
  { name: 'Abu Dhabi Inv Authority', type: 'FII' },
]

const MF_POOL: HolderTemplate[] = [
  { name: 'SBI Mutual Fund', type: 'MF' },
  { name: 'ICICI Pru Mutual Fund', type: 'MF' },
  { name: 'HDFC Mutual Fund', type: 'MF' },
  { name: 'Nippon Mutual Fund', type: 'MF' },
  { name: 'Axis Mutual Fund', type: 'MF' },
  { name: 'Kotak Mutual Fund', type: 'MF' },
  { name: 'UTI Mutual Fund', type: 'MF' },
  { name: 'DSP Mutual Fund', type: 'MF' },
]

const INSURANCE_POOL: HolderTemplate[] = [
  { name: 'LIC of India', type: 'Insurance' },
  { name: 'HDFC Life', type: 'Insurance' },
  { name: 'ICICI Pru Life', type: 'Insurance' },
  { name: 'SBI Life Insurance', type: 'Insurance' },
  { name: 'Max Life Insurance', type: 'Insurance' },
]

const INDIVIDUAL_POOL: HolderTemplate[] = [
  { name: 'Rakesh Jhunjhunwala HUF', type: 'Individual' },
  { name: 'Radhakishan Damani', type: 'Individual' },
  { name: 'Azim Premji Trust', type: 'Individual' },
  { name: 'Mukul Agrawal', type: 'Individual' },
  { name: 'Public — Retail (combined)', type: 'Individual' },
]

interface PromoterEntry {
  name: string
  pct: number
}

const PROMOTERS: Record<string, PromoterEntry[]> = {
  'RELIANCE.NS': [{ name: 'Reliance Promoter Group', pct: 50.4 }],
  'HDFCBANK.NS': [{ name: 'Reliance HDFC Promoter Holding (post-merger)', pct: 0 }],
  'INFY.NS': [{ name: 'Infosys Promoter Group', pct: 14.6 }],
  'TCS.NS': [{ name: 'Tata Sons Pvt Ltd', pct: 71.7 }],
  'LT.NS': [{ name: 'No identified promoter', pct: 0 }],
  'DMART.NS': [{ name: 'Damani Family (Promoters)', pct: 74.6 }],
  'TITAN.NS': [{ name: 'Tata Sons + TIDCO', pct: 52.9 }],
  'BAJFINANCE.NS': [{ name: 'Bajaj Finserv Ltd (Promoter)', pct: 54.7 }],
  'ASIANPAINT.NS': [{ name: 'Asian Paints Promoter Group', pct: 52.6 }],
  'MARUTI.NS': [{ name: 'Suzuki Motor Corporation', pct: 58.1 }],
}

/* ===== deterministic seeded random ===== */

function seeded(seed: string, i: number): number {
  let h = 0
  for (let c = 0; c < seed.length; c++) h = (h * 31 + seed.charCodeAt(c)) | 0
  const x = Math.sin((h + i) * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function pick<T>(arr: T[], seed: string, count: number, offset = 0): T[] {
  const indices = arr.map((_, i) => i)
  // shuffle deterministically
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(seed + 'shuf' + offset, i) * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.slice(0, count).map((i) => arr[i])
}

/* ===== holder row generator ===== */

function classifySignal(prev: number | null, curr: number | null, change: number): HolderRow['signal'] {
  if (prev === null && curr !== null) return 'New Entry'
  if (curr === null) return 'Exited'
  if (Math.abs(change) < 0.04) return 'Stable'
  if (change > 0.18) return 'Accumulating'
  if (change < -0.18) return 'Reducing'
  if (change < -0.06) return 'Watch'
  return change > 0 ? 'Accumulating' : 'Reducing'
}

function buildHolders(ticker: string): HolderRow[] {
  const promoter = PROMOTERS[ticker]?.[0] ?? { name: 'Promoter Group', pct: 0 }
  const fiiNames = pick(FII_POOL, ticker + 'fii', 5, 0)
  const mfNames = pick(MF_POOL, ticker + 'mf', 4, 1)
  const insNames = pick(INSURANCE_POOL, ticker + 'ins', 3, 2)
  const indNames = pick(INDIVIDUAL_POOL, ticker + 'ind', 2, 3)

  const holders: HolderRow[] = []

  // promoter row (if exists)
  if (promoter.pct > 0) {
    const drift = (seeded(ticker + 'prom', 0) - 0.55) * 0.3 // small drift, mostly 0
    const curr = +(promoter.pct + drift).toFixed(2)
    const prev = +(promoter.pct).toFixed(2)
    holders.push({
      name: promoter.name,
      type: 'Promoter',
      prevPct: prev,
      currPct: curr,
      changePct: +(curr - prev).toFixed(2),
      signal: classifySignal(prev, curr, curr - prev),
    })
  }

  // FIIs - vary per name
  fiiNames.forEach((h, idx) => {
    const base = 0.6 + seeded(ticker + h.name, 0) * 2.4
    const ch = (seeded(ticker + h.name, 1) - 0.6) * 0.95 // bias slight reduce
    const prev = +base.toFixed(2)
    const curr = +(prev + ch).toFixed(2)
    if (curr <= 0.05) {
      // exit
      holders.push({
        name: h.name,
        type: h.type,
        prevPct: prev,
        currPct: null,
        changePct: -prev,
        signal: 'Exited',
      })
    } else if (idx === 0 && seeded(ticker + h.name, 2) > 0.7) {
      // new entry occasionally
      holders.push({
        name: h.name,
        type: h.type,
        prevPct: null,
        currPct: curr,
        changePct: curr,
        signal: 'New Entry',
      })
    } else {
      holders.push({
        name: h.name,
        type: h.type,
        prevPct: prev,
        currPct: curr,
        changePct: +(curr - prev).toFixed(2),
        signal: classifySignal(prev, curr, curr - prev),
      })
    }
  })

  // MFs - mostly accumulating (DII bucket)
  mfNames.forEach((h) => {
    const base = 0.8 + seeded(ticker + h.name, 0) * 2.8
    const ch = (seeded(ticker + h.name, 1) - 0.4) * 0.85 // bias toward accumulation
    const prev = +base.toFixed(2)
    const curr = +(prev + ch).toFixed(2)
    holders.push({
      name: h.name,
      type: 'MF',
      prevPct: prev,
      currPct: curr,
      changePct: +(curr - prev).toFixed(2),
      signal: classifySignal(prev, curr, curr - prev),
    })
  })

  // Insurance
  insNames.forEach((h) => {
    const base = 1.2 + seeded(ticker + h.name, 0) * 5.5
    const ch = (seeded(ticker + h.name, 1) - 0.42) * 0.6
    const prev = +base.toFixed(2)
    const curr = +(prev + ch).toFixed(2)
    holders.push({
      name: h.name,
      type: 'Insurance',
      prevPct: prev,
      currPct: curr,
      changePct: +(curr - prev).toFixed(2),
      signal: classifySignal(prev, curr, curr - prev),
    })
  })

  // Individuals
  indNames.forEach((h) => {
    const base = h.name.startsWith('Public') ? 8 + seeded(ticker + h.name, 0) * 6 : 0.5 + seeded(ticker + h.name, 0) * 1.4
    const ch = (seeded(ticker + h.name, 1) - 0.5) * 0.4
    const prev = +base.toFixed(2)
    const curr = +(prev + ch).toFixed(2)
    holders.push({
      name: h.name,
      type: 'Individual',
      prevPct: prev,
      currPct: curr,
      changePct: +(curr - prev).toFixed(2),
      signal: classifySignal(prev, curr, curr - prev),
    })
  })

  // sort by absolute change desc, but keep promoter on top
  return holders.sort((a, b) => {
    if (a.type === 'Promoter') return -1
    if (b.type === 'Promoter') return 1
    return Math.abs(b.changePct) - Math.abs(a.changePct)
  })
}

/* ===== heatmap ===== */

function classifyDelta(delta: number, hadFlip: boolean): HeatmapCell['state'] {
  if (Math.abs(delta) < 0.06) return 'stable'
  if (hadFlip) return 'watch'
  return delta > 0 ? 'up' : 'down'
}

function buildHeatmap(ticker: string): { quarters: string[]; rows: HeatmapRow[] } {
  const ownership = getOwnership20q(ticker).slice(-9) // 9 to compute 8 deltas
  const quarters = ownership.slice(1).map((q) => q.quarter)
  const buckets: { key: keyof typeof ownership[0] | 'individual'; label: HeatmapRow['bucket'] }[] = [
    { key: 'promoter', label: 'Promoter' },
    { key: 'fii', label: 'FII' },
    { key: 'dii', label: 'DII' },
    { key: 'public', label: 'Public' },
    { key: 'individual', label: 'Individual / Others' },
  ]

  const rows: HeatmapRow[] = buckets.map(({ key, label }) => {
    const cells: HeatmapCell[] = []
    let prevDelta = 0
    for (let i = 1; i < ownership.length; i++) {
      let delta: number
      if (key === 'individual') {
        // synthesize Individual/Others — slow drift with seeded noise
        const s = seeded(ticker + 'ind', i) - 0.5
        delta = +(s * 0.45).toFixed(2)
      } else {
        const k = key as 'promoter' | 'fii' | 'dii' | 'public'
        delta = +(ownership[i][k] - ownership[i - 1][k]).toFixed(2)
      }
      const flipped = i > 1 && Math.sign(delta) !== 0 && Math.sign(prevDelta) !== 0 && Math.sign(delta) !== Math.sign(prevDelta)
      cells.push({ delta, state: classifyDelta(delta, flipped && Math.abs(delta) > 0.12) })
      prevDelta = delta
    }
    return { bucket: label, cells }
  })

  return { quarters, rows }
}

/* ===== breadth ===== */

function buildBreadth(ticker: string, finalNetBias: number): BreadthPoint[] {
  const ownership = getOwnership20q(ticker).slice(-8)
  return ownership.map((q, i) => {
    const newE = Math.round(8 + seeded(ticker + 'ne', i) * 18 + (finalNetBias > 0 ? 4 : 0))
    const exits = Math.round(6 + seeded(ticker + 'ex', i) * 14 - (finalNetBias > 0 ? 2 : -3))
    return { quarter: q.quarter, newEntries: newE, exits, net: newE - exits }
  })
}

/* ===== story ===== */

interface StoryConfig {
  status: OwnershipTrendsStory['status']
  oneLiner: string
  pos: string
  risk: string
  trendNote: string
  breadth: string
  finalRead: string
}

const stories: Record<string, StoryConfig> = {
  'RELIANCE.NS': {
    status: 'Stable',
    oneLiner: 'Promoter unchanged, DIIs adding gradually, FIIs trimming at the margin.',
    pos: 'DII ownership up for 5 straight quarters',
    risk: 'Two large FIIs trimmed by >0.3pp this quarter',
    trendNote: 'Promoter band ±0.2pp, DII trend up 1.6pp over last 4 quarters',
    breadth: 'Net new institutions positive in 6 of last 8 quarters',
    finalRead: 'Ownership trend is broadly stable. Promoter holding has not moved, DIIs continue to accumulate, and breadth is positive though narrow. Selective FII reductions are the only soft spot — manageable but worth tracking.',
  },
  'HDFCBANK.NS': {
    status: 'Improving',
    oneLiner: 'Strong DII accumulation with widening institutional breadth post-merger.',
    pos: 'DIIs added 4.2pp over last 4 quarters',
    risk: 'FII share continues to drift lower post-merger',
    trendNote: 'DII trend is the steepest in the index — 6 straight quarters of accumulation',
    breadth: 'Breadth is broad: 38 new institutions entered in latest quarter',
    finalRead: 'Ownership trend is constructive. DII accumulation is broad-based and persistent, breadth is widening, and the FII drift is slowing. Comfortable to size up on ownership signal alone.',
  },
  'INFY.NS': {
    status: 'Improving',
    oneLiner: 'Six quarters of DII accumulation with clean institutional breadth.',
    pos: 'DII accumulation now in 6th straight quarter',
    risk: 'Three FIIs reduced exposure this quarter',
    trendNote: 'DII slope is steady; FII reductions look like rotation, not concern',
    breadth: 'Net new institutions positive across last 5 quarters',
    finalRead: 'Clean ownership picture. DII accumulation is consistent and now broad-based, FII reductions are gradual, and breadth is steadily improving. Investable on ownership signal alone.',
  },
  'TCS.NS': {
    status: 'Stable',
    oneLiner: 'Promoter rock steady at 72%, DIIs adding gradually.',
    pos: 'DII holding crossed 11% for first time in 3 years',
    risk: 'FII outflows continued for 4th quarter in a row',
    trendNote: 'Promoter band 0.0pp, DII drift +0.4pp/Q',
    breadth: 'Breadth improving but slowly — 12 new entries vs 5 exits',
    finalRead: 'Ownership trend is stable. Tata Sons holding is unchanged, DII accumulation is gradual but consistent, and FII reductions are moderate. The picture supports a comfortable long stance.',
  },
  'LT.NS': {
    status: 'Improving',
    oneLiner: 'Institutional company with deepening DII anchor and clean breadth.',
    pos: 'DII share crossed 38% — multi-year high',
    risk: 'Marginal FII outflow this quarter',
    trendNote: 'DII trend persistent through full 20-quarter window',
    breadth: 'Breadth solid: 18 new entries vs 7 exits in latest quarter',
    finalRead: 'Ownership trend is improving on every metric. DII accumulation is the dominant story and breadth is broadening across mutual funds and insurance. Comfortable long.',
  },
  'DMART.NS': {
    status: 'Stable',
    oneLiner: 'High promoter holding with rising foreign interest, but float remains thin.',
    pos: 'FII holding crossed 11% — multi-year high',
    risk: 'Public float compressed further this quarter',
    trendNote: 'Promoter unchanged; FII drift +0.4pp over 4 quarters',
    breadth: 'Breadth narrow: only 9 new entries — typical of tightly held names',
    finalRead: 'Ownership trend is stable with rising foreign interest. The only watch is float thinness, which makes price reactive to flows. Investable but size with awareness of the liquidity tail.',
  },
  'TITAN.NS': {
    status: 'Stable',
    oneLiner: 'Tata holding stable, FII share resilient, DIIs accumulating quietly.',
    pos: 'DII holding at 5-year high',
    risk: 'One mid-size FII trimmed sharply this quarter',
    trendNote: 'Promoter steady; DII +1.4pp over 4 quarters',
    breadth: 'Breadth modest but positive: 14 new entries vs 8 exits',
    finalRead: 'Ownership trend is comfortable. Promoter holding stable, FIIs sticky, DIIs accumulating. The one FII trim looks idiosyncratic. Confident long is supported.',
  },
  'BAJFINANCE.NS': {
    status: 'Weakening',
    oneLiner: 'FII reduction has accelerated; DIIs absorbing but breadth narrowing.',
    pos: 'DIIs absorbed FII selling cleanly this quarter',
    risk: 'Three FIIs cut by more than 0.3pp each',
    trendNote: 'FII trend now -2.8pp over 4 quarters; DII offsets partially',
    breadth: 'Breadth softening: 11 new entries vs 14 exits',
    finalRead: 'Ownership trend has softened. FII reduction is no longer gradual — pace has picked up and is concentrated in a few large names. DIIs are absorbing well, but breadth is narrowing. Hold with vigilance; avoid sizing up until FII flow stabilizes.',
  },
  'ASIANPAINT.NS': {
    status: 'Risky',
    oneLiner: 'FII exit accelerating, breadth narrowing — ownership signal is weakening.',
    pos: 'DIIs continued to add, partial cushion',
    risk: 'FII share at 5-year low, breadth turning negative',
    trendNote: 'FII -1.6pp this quarter; broad-based reduction across 6 names',
    breadth: 'Breadth negative: 8 new entries vs 18 exits',
    finalRead: 'Ownership trend is weakening. FII reduction has been broad-based and FII share is at a 5-year low. DIIs are absorbing but not at the same pace. Trim or hold; avoid fresh accumulation until FII flow stabilizes.',
  },
  'MARUTI.NS': {
    status: 'Improving',
    oneLiner: 'Promoter stable, DII accumulation strong, breadth widening.',
    pos: 'DII holding at multi-year high',
    risk: 'Two FIIs continued to trim',
    trendNote: 'DII +1.8pp over last 4 quarters; promoter unchanged',
    breadth: 'Breadth positive: 16 new entries vs 9 exits',
    finalRead: 'Ownership trend is constructive. Promoter unchanged, DII accumulation broad-based, FII reduction gradual and absorbed. Comfortable long supported by ownership trend.',
  },
}

export function getOwnershipTrends(ticker: string): OwnershipTrendsData {
  const cfg = stories[ticker] ?? stories['RELIANCE.NS']
  const story: OwnershipTrendsStory = {
    status: cfg.status,
    oneLiner: cfg.oneLiner,
    positiveChange: cfg.pos,
    riskChange: cfg.risk,
    trendAnnotation: cfg.trendNote,
    breadthRead: cfg.breadth,
    finalRead: cfg.finalRead,
  }
  const finalNetBias = cfg.status === 'Improving' ? 1 : cfg.status === 'Risky' ? -1 : 0
  return {
    story,
    heatmap: buildHeatmap(ticker),
    holders: buildHolders(ticker),
    breadth: buildBreadth(ticker, finalNetBias),
  }
}
