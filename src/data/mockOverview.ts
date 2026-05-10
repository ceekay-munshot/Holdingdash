import type { CompanyOverview, SignalLevel, TrendDirection } from '../types'
import { getOwnership20q } from './mockOwnership'

interface Story {
  signal: SignalLevel
  trend: TrendDirection
  oneLiner: string
  ownershipTrendRead: string
  holderMovementRead: string
  insiderDealsRead: string
  governanceRead: string
  recent: { positive: string; negative: string; unusual: string }
  buySideRead: string
  topAccumulator: { name: string; type: 'FII' | 'DII' | 'MF' | 'Insurance'; changePct: number; currentPct: number }
  topReducer: { name: string; type: 'FII' | 'DII' | 'MF' | 'Insurance'; changePct: number; currentPct: number }
  newEntries: number
  exits: number
  breadth: number
  breadthChange: number
  insiderSignal: 'Routine' | 'Cluster Buy' | 'Cluster Sell' | 'Mixed'
  insiderBuy: number
  insiderSell: number
  bulkNet: number
  blockNet: number
  riskLevel: 'Low' | 'Medium' | 'High'
  rptPct: number
  rptYoy: number
  auditorChanges: number
  pledgePct: number
  pledgeChange: number
}

const stories: Record<string, Story> = {
  'RELIANCE.NS': {
    signal: 'Watch', trend: 'Stable',
    oneLiner: 'Promoter holding stable, DII accumulation steady, but related-party trend warrants monitoring.',
    ownershipTrendRead: 'DIIs adding for 5 quarters, FIIs trimming',
    holderMovementRead: 'LIC top accumulator, two FIIs trimmed',
    insiderDealsRead: 'No insider cluster, bulk deals routine',
    governanceRead: 'RPT-to-revenue trending up — watch zone',
    recent: {
      positive: 'DII ownership up for 5 straight quarters',
      negative: 'Two large FIIs reduced exposure this quarter',
      unusual: 'RPT-to-revenue moved into watch zone (>9%)',
    },
    buySideRead: 'Ownership trend is broadly stable. Promoter holding has not moved, DIIs continue to accumulate, and insider activity looks routine. The one yellow flag is rising related-party transactions, which now sit above the comfort threshold. Stock remains investable on ownership signal, but RPT trajectory should anchor position sizing.',
    topAccumulator: { name: 'Life Insurance Corp', type: 'Insurance', changePct: 0.42, currentPct: 6.34 },
    topReducer: { name: 'Vanguard Group', type: 'FII', changePct: -0.31, currentPct: 1.86 },
    newEntries: 14, exits: 8, breadth: 1248, breadthChange: 22,
    insiderSignal: 'Routine', insiderBuy: 12, insiderSell: 18, bulkNet: 86, blockNet: -42,
    riskLevel: 'Medium', rptPct: 9.4, rptYoy: 1.6, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'HDFCBANK.NS': {
    signal: 'Positive', trend: 'Improving',
    oneLiner: 'Institutional breadth widening post-merger; DII accumulation strong, governance clean.',
    ownershipTrendRead: 'DIIs added 4.2pp in 4 quarters',
    holderMovementRead: '38 new institutions in last quarter',
    insiderDealsRead: 'Insider activity routine, no cluster signal',
    governanceRead: 'RPT and pledges in low zone',
    recent: {
      positive: 'DII holding up 4.2pp in last 4 quarters',
      negative: 'FII trimming continued post-merger transition',
      unusual: '38 new institutions entered the register',
    },
    buySideRead: 'Ownership signal is constructive. DII accumulation is broad-based — both insurance and mutual funds adding — and institutional breadth has widened sharply post HDFC merger. FII outflows are slowing, and governance markers (RPT, pledge, auditor) are clean. Investable from an ownership angle with room to size up.',
    topAccumulator: { name: 'SBI Mutual Fund', type: 'MF', changePct: 0.68, currentPct: 4.12 },
    topReducer: { name: 'BlackRock', type: 'FII', changePct: -0.24, currentPct: 2.31 },
    newEntries: 38, exits: 6, breadth: 1640, breadthChange: 32,
    insiderSignal: 'Routine', insiderBuy: 4, insiderSell: 11, bulkNet: 142, blockNet: 88,
    riskLevel: 'Low', rptPct: 3.2, rptYoy: -0.4, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'INFY.NS': {
    signal: 'Positive', trend: 'Improving',
    oneLiner: 'DII accumulation for 6 quarters, governance clean, insider activity routine.',
    ownershipTrendRead: 'DII up 5.6pp over 20 quarters',
    holderMovementRead: 'ICICI Pru top accumulator, FII trimming',
    insiderDealsRead: 'Insider grants routine, no cluster sell',
    governanceRead: 'RPT low, no auditor changes',
    recent: {
      positive: 'DII accumulation now in its 6th straight quarter',
      negative: 'Three FIIs reduced exposure in latest quarter',
      unusual: 'New mutual fund entry in top-15 holders list',
    },
    buySideRead: 'Clean ownership picture. DII accumulation is consistent and now broad-based across mutual funds and insurance. FII reductions are gradual and look like rotation rather than concern. Insider activity is routine and governance markers are clean. Comfortable position to size up on ownership signal alone.',
    topAccumulator: { name: 'ICICI Pru Mutual Fund', type: 'MF', changePct: 0.54, currentPct: 3.84 },
    topReducer: { name: 'Capital Group', type: 'FII', changePct: -0.36, currentPct: 1.42 },
    newEntries: 22, exits: 9, breadth: 1418, breadthChange: 18,
    insiderSignal: 'Routine', insiderBuy: 2, insiderSell: 9, bulkNet: 32, blockNet: 14,
    riskLevel: 'Low', rptPct: 2.4, rptYoy: 0.1, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'TCS.NS': {
    signal: 'Positive', trend: 'Stable',
    oneLiner: 'Promoter holding rock steady at 72%, DII accumulation healthy, governance clean.',
    ownershipTrendRead: 'Promoter unchanged, DIIs adding gradually',
    holderMovementRead: 'HDFC AMC top accumulator',
    insiderDealsRead: 'Insider activity minimal and routine',
    governanceRead: 'RPT low, no governance flags',
    recent: {
      positive: 'DII holding crossed 11% for first time in 3 years',
      negative: 'FII outflows continued for 4th quarter',
      unusual: 'Promoter buyback boosted promoter holding mathematically',
    },
    buySideRead: 'Ownership picture is among the cleanest in the index. Tata Sons holding is stable, DII accumulation is gradual but consistent, and there is no governance noise. FII reduction is the only soft spot, but pace is moderate and breadth among DIIs more than absorbs it.',
    topAccumulator: { name: 'HDFC Mutual Fund', type: 'MF', changePct: 0.31, currentPct: 1.94 },
    topReducer: { name: 'Norges Bank', type: 'FII', changePct: -0.14, currentPct: 0.86 },
    newEntries: 12, exits: 5, breadth: 1124, breadthChange: 8,
    insiderSignal: 'Routine', insiderBuy: 1, insiderSell: 4, bulkNet: 18, blockNet: 22,
    riskLevel: 'Low', rptPct: 1.8, rptYoy: 0.0, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'LT.NS': {
    signal: 'Positive', trend: 'Improving',
    oneLiner: 'Institutional company with deepening DII base and clean governance.',
    ownershipTrendRead: 'DIIs now own 38%+, FII steady',
    holderMovementRead: 'LIC remains anchor holder',
    insiderDealsRead: 'No insider concerns',
    governanceRead: 'Governance among the cleanest in pack',
    recent: {
      positive: 'DII share crossed 38% — highest in 5 years',
      negative: 'Marginal FII outflow this quarter',
      unusual: 'Two new domestic insurance entries in top-20',
    },
    buySideRead: 'Institution-owned company with deepening DII anchor. DII share continues to expand, FII activity is two-way but stable, and governance is clean. Ownership signal supports a confident long stance with minimal need for risk overlay.',
    topAccumulator: { name: 'LIC of India', type: 'Insurance', changePct: 0.46, currentPct: 12.84 },
    topReducer: { name: 'Fidelity', type: 'FII', changePct: -0.18, currentPct: 1.62 },
    newEntries: 18, exits: 7, breadth: 1342, breadthChange: 14,
    insiderSignal: 'Routine', insiderBuy: 1, insiderSell: 3, bulkNet: 24, blockNet: 12,
    riskLevel: 'Low', rptPct: 4.1, rptYoy: 0.2, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'DMART.NS': {
    signal: 'Watch', trend: 'Stable',
    oneLiner: 'High promoter holding, FII interest building, but float remains thin.',
    ownershipTrendRead: 'FII share rising slowly, public float thin',
    holderMovementRead: 'Foreign MFs adding, retail trimming',
    insiderDealsRead: 'No insider clusters, low deal volume',
    governanceRead: 'RPT moderate but stable',
    recent: {
      positive: 'FII holding crossed 11% — multi-year high',
      negative: 'Public float compressed further this quarter',
      unusual: 'A large foreign MF entered top-10 holders',
    },
    buySideRead: 'Tightly-held promoter company with rising foreign interest. The watch is purely on float thinness, which makes price reactive to flows. Governance is acceptable, RPT is contained, and insider activity is non-noisy. Investable but size with awareness of liquidity tail.',
    topAccumulator: { name: 'Government of Singapore', type: 'FII', changePct: 0.38, currentPct: 1.92 },
    topReducer: { name: 'Retail (combined)', type: 'MF', changePct: -0.22, currentPct: 6.84 },
    newEntries: 9, exits: 4, breadth: 884, breadthChange: 6,
    insiderSignal: 'Routine', insiderBuy: 0, insiderSell: 2, bulkNet: 14, blockNet: 6,
    riskLevel: 'Medium', rptPct: 5.6, rptYoy: 0.4, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'TITAN.NS': {
    signal: 'Positive', trend: 'Stable',
    oneLiner: 'Tata holding stable, FII share resilient, governance clean.',
    ownershipTrendRead: 'Promoter steady, FIIs holding 17%+',
    holderMovementRead: 'Mutual fund accumulation continues',
    insiderDealsRead: 'No insider concerns, routine ESOP',
    governanceRead: 'Governance clean, RPT low',
    recent: {
      positive: 'DII holding at 5-year high',
      negative: 'One mid-size FII trimmed sharply',
      unusual: 'New global pension fund entered top-30',
    },
    buySideRead: 'Ownership story is comfortable. Promoter holding stable, FIIs sticky, DIIs accumulating. Governance is clean and insider activity routine. The only flag is one FII reduction, which looks idiosyncratic. Confident long stance is supported.',
    topAccumulator: { name: 'Nippon Mutual Fund', type: 'MF', changePct: 0.28, currentPct: 2.42 },
    topReducer: { name: 'Schroders', type: 'FII', changePct: -0.34, currentPct: 1.18 },
    newEntries: 14, exits: 8, breadth: 1042, breadthChange: 12,
    insiderSignal: 'Routine', insiderBuy: 1, insiderSell: 3, bulkNet: 11, blockNet: 4,
    riskLevel: 'Low', rptPct: 2.9, rptYoy: 0.0, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'BAJFINANCE.NS': {
    signal: 'Watch', trend: 'Weakening',
    oneLiner: 'FII trimming has accelerated; DIIs absorbing but breadth narrowing.',
    ownershipTrendRead: 'FII down 2.8pp in 4 quarters',
    holderMovementRead: 'Three FIIs reduced sharply this quarter',
    insiderDealsRead: 'Insider sells slightly above routine',
    governanceRead: 'RPT moderate, pledge nil',
    recent: {
      positive: 'DIIs absorbed FII selling cleanly',
      negative: 'Three FIIs cut by >0.3pp each',
      unusual: 'Insider sell value crossed quarterly average',
    },
    buySideRead: 'Ownership signal has softened. FII reduction is no longer gradual — pace has picked up and is concentrated in a few large names. DIIs are absorbing well, so breadth is intact, but the trend deserves to be watched closely. Insider sells are slightly elevated but not yet a cluster signal. Hold with vigilance; avoid sizing up until FII flows stabilize.',
    topAccumulator: { name: 'HDFC Life', type: 'Insurance', changePct: 0.41, currentPct: 2.18 },
    topReducer: { name: 'GQG Partners', type: 'FII', changePct: -0.62, currentPct: 1.94 },
    newEntries: 11, exits: 14, breadth: 968, breadthChange: -6,
    insiderSignal: 'Mixed', insiderBuy: 6, insiderSell: 24, bulkNet: -34, blockNet: -22,
    riskLevel: 'Medium', rptPct: 6.4, rptYoy: 0.6, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'ASIANPAINT.NS': {
    signal: 'Risky', trend: 'Weakening',
    oneLiner: 'FII exit accelerating, breadth narrowing, RPT trend worth watching.',
    ownershipTrendRead: 'FII at 5-year low, DII partly compensating',
    holderMovementRead: 'Several FIIs in net reduction',
    insiderDealsRead: 'Mixed insider activity, modest sells',
    governanceRead: 'RPT-to-revenue rising — caution',
    recent: {
      positive: 'DIIs continued to add, partial cushion',
      negative: 'FII share at 5-year low',
      unusual: 'RPT moved above 7% — watch zone',
    },
    buySideRead: 'Ownership signal is weakening. FII reduction has been broad-based — six large FIIs trimmed this quarter — and the cumulative outflow has taken FII share to a 5-year low. DIIs are absorbing but not at the same pace. Add to that a rising related-party trend and the picture turns more cautious. Trim or hold; avoid fresh accumulation until FII flow stabilizes and RPT trajectory clarifies.',
    topAccumulator: { name: 'ICICI Pru Life', type: 'Insurance', changePct: 0.32, currentPct: 2.48 },
    topReducer: { name: 'SBI Magnum', type: 'MF', changePct: -0.42, currentPct: 1.62 },
    newEntries: 8, exits: 18, breadth: 902, breadthChange: -12,
    insiderSignal: 'Mixed', insiderBuy: 4, insiderSell: 16, bulkNet: -68, blockNet: -28,
    riskLevel: 'Medium', rptPct: 7.2, rptYoy: 1.1, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
  'MARUTI.NS': {
    signal: 'Positive', trend: 'Improving',
    oneLiner: 'Promoter stable, DII accumulation strong, governance clean.',
    ownershipTrendRead: 'DII up steadily, FII trimming gradually',
    holderMovementRead: 'LIC and SBI MF top accumulators',
    insiderDealsRead: 'Insider activity routine',
    governanceRead: 'RPT moderate, governance clean',
    recent: {
      positive: 'DII holding at multi-year high',
      negative: 'Two FIIs continued to trim',
      unusual: 'New pension fund entry in top-15',
    },
    buySideRead: 'Ownership is constructive. Promoter unchanged, DII accumulation broad-based, FII reduction gradual and absorbed. Governance is clean and insider activity routine. Comfortable long, supported by ownership trend.',
    topAccumulator: { name: 'LIC of India', type: 'Insurance', changePct: 0.36, currentPct: 4.82 },
    topReducer: { name: 'JPMorgan AM', type: 'FII', changePct: -0.21, currentPct: 1.34 },
    newEntries: 16, exits: 9, breadth: 1184, breadthChange: 14,
    insiderSignal: 'Routine', insiderBuy: 2, insiderSell: 5, bulkNet: 38, blockNet: 14,
    riskLevel: 'Low', rptPct: 4.8, rptYoy: -0.1, auditorChanges: 0, pledgePct: 0, pledgeChange: 0,
  },
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function makeMonthlyFlow(seedBuy: number, seedSell: number, signal: 'Routine' | 'Mixed') {
  return months.slice(-6).map((month, i) => {
    const wave = Math.sin((i + 1) * 0.7) * 0.4 + 0.6
    const buy = +(seedBuy * wave * (0.6 + i * 0.06)).toFixed(1)
    const sell = +(seedSell * (1.1 - i * 0.05) * (signal === 'Mixed' ? 1.2 : 1)).toFixed(1)
    return { month, buy, sell }
  })
}

function makeRptTrend(rptPct: number, ownership: { quarter: string }[]) {
  return ownership.slice(-12).map((q, i) => {
    const revenue = 100 + i * 2 + Math.sin(i * 0.6) * 1.4
    const rpt = (rptPct - 1.4) + i * 0.12 + Math.sin(i * 0.8) * 0.18
    return { quarter: q.quarter, rpt: +rpt.toFixed(2), revenue: +revenue.toFixed(2) }
  })
}

function sparkFromOwnership(o: { dii: number }[]): number[] {
  return o.slice(-10).map((q) => q.dii)
}

export function getOverview(ticker: string): CompanyOverview {
  const story = stories[ticker] ?? stories['RELIANCE.NS']
  const ownership = getOwnership20q(ticker)
  return {
    signal: {
      signal: story.signal,
      trend: story.trend,
      oneLiner: story.oneLiner,
      sparkline: sparkFromOwnership(ownership),
      ownershipTrendRead: story.ownershipTrendRead,
      holderMovementRead: story.holderMovementRead,
      insiderDealsRead: story.insiderDealsRead,
      governanceRead: story.governanceRead,
      recentChanges: story.recent,
      buySideRead: story.buySideRead,
    },
    ownership20q: ownership,
    holderMovement: {
      topAccumulator: story.topAccumulator,
      topReducer: story.topReducer,
      newEntries: story.newEntries,
      exits: story.exits,
      institutionalBreadth: story.breadth,
      breadthChange: story.breadthChange,
    },
    insiderDeals: {
      insiderSignal: story.insiderSignal,
      insiderBuyValue: story.insiderBuy,
      insiderSellValue: story.insiderSell,
      bulkDealNet: story.bulkNet,
      blockDealNet: story.blockNet,
      monthlyFlow: makeMonthlyFlow(story.insiderBuy || 4, story.insiderSell || 8, story.insiderSignal === 'Mixed' ? 'Mixed' : 'Routine'),
    },
    governance: {
      riskLevel: story.riskLevel,
      rptToRevenuePct: story.rptPct,
      rptYoyChange: story.rptYoy,
      auditorChanges: story.auditorChanges,
      pledgePct: story.pledgePct,
      pledgeChange: story.pledgeChange,
      rptTrend: makeRptTrend(story.rptPct, ownership),
    },
  }
}
