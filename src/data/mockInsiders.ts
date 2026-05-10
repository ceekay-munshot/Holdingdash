import type {
  InsiderClassification,
  InsiderDealsData,
  InsiderRole,
  InsiderSignal,
  InsiderSignalCard,
  InsiderTrade,
  InsiderType,
  PricePoint,
} from '../types'
import { getDeals, getDealsRead } from './mockDeals'

interface PriceConfig {
  startPrice: number
  endPrice: number
  volatility: number // 0..1
  // optional drawdown windows
  drawdowns?: { startMonth: number; durationMonths: number; deltaPct: number }[]
}

interface InsiderPerson {
  name: string
  role: InsiderRole
}

interface CompanyConfig {
  price: PriceConfig
  people: InsiderPerson[]
  // narrative — drives summary
  narrative: 'positive' | 'neutral' | 'watch' | 'risky'
  oneLiner: string
  mainPositive: string
  mainConcern: string
  cards: InsiderSignalCard[]
  finalRead: string
  // trade behavior
  buyMonths: number[] // month indices (0..120) when buys cluster
  sellMonths: number[] // base sell months
  clusterSellMonths?: number[] // months where multiple insiders sell together
}

/* ===== seeded random ===== */
function seeded(seed: string, i: number): number {
  let h = 0
  for (let c = 0; c < seed.length; c++) h = (h * 31 + seed.charCodeAt(c)) | 0
  const x = Math.sin((h + i) * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

/* ===== per-company configs ===== */

const RELIANCE_PEOPLE: InsiderPerson[] = [
  { name: 'Mukesh D Ambani', role: 'Promoter' },
  { name: 'Nita M Ambani', role: 'Promoter Group' },
  { name: 'Akash M Ambani', role: 'Director' },
  { name: 'Anant M Ambani', role: 'Director' },
  { name: 'Srikanth Venkatachari', role: 'CFO' },
  { name: 'Hital Meswani', role: 'Director' },
]
const HDFCBANK_PEOPLE: InsiderPerson[] = [
  { name: 'Sashidhar Jagdishan', role: 'CEO/MD' },
  { name: 'Srinivasan Vaidyanathan', role: 'CFO' },
  { name: 'Kaizad Bharucha', role: 'Director' },
  { name: 'Renu Karnad', role: 'Director' },
  { name: 'Ashish Parthasarathy', role: 'KMP' },
]
const INFY_PEOPLE: InsiderPerson[] = [
  { name: 'Salil Parekh', role: 'CEO/MD' },
  { name: 'Nilanjan Roy', role: 'CFO' },
  { name: 'Nandan M Nilekani', role: 'Promoter' },
  { name: 'D Sundaram', role: 'Director' },
  { name: 'Inderpreet Sawhney', role: 'KMP' },
]
const TCS_PEOPLE: InsiderPerson[] = [
  { name: 'K Krithivasan', role: 'CEO/MD' },
  { name: 'Samir Seksaria', role: 'CFO' },
  { name: 'N Chandrasekaran', role: 'Director' },
  { name: 'N G Subramaniam', role: 'KMP' },
  { name: 'Aarthi Subramanian', role: 'Director' },
]
const LT_PEOPLE: InsiderPerson[] = [
  { name: 'S N Subrahmanyan', role: 'CEO/MD' },
  { name: 'R Shankar Raman', role: 'CFO' },
  { name: 'A M Naik', role: 'Director' },
  { name: 'Subramanian Sarma', role: 'Director' },
]
const DMART_PEOPLE: InsiderPerson[] = [
  { name: 'Radhakishan Damani', role: 'Promoter' },
  { name: 'Neville Noronha', role: 'CEO/MD' },
  { name: 'Niladri Deb', role: 'CFO' },
  { name: 'Ramakant Baheti', role: 'Director' },
]
const TITAN_PEOPLE: InsiderPerson[] = [
  { name: 'C K Venkataraman', role: 'CEO/MD' },
  { name: 'Ashok Sonthalia', role: 'CFO' },
  { name: 'Bhaskar Bhat', role: 'Director' },
  { name: 'B Santhanam', role: 'Director' },
]
const BAJFIN_PEOPLE: InsiderPerson[] = [
  { name: 'Rajeev Jain', role: 'CEO/MD' },
  { name: 'Sandeep Jain', role: 'CFO' },
  { name: 'Sanjiv Bajaj', role: 'Promoter' },
  { name: 'Anami N Roy', role: 'Director' },
  { name: 'Anup Saha', role: 'KMP' },
]
const ASPAINT_PEOPLE: InsiderPerson[] = [
  { name: 'Amit Syngle', role: 'CEO/MD' },
  { name: 'R J Jeyamurugan', role: 'CFO' },
  { name: 'Manish Choksi', role: 'Promoter' },
  { name: 'Arun Nanda', role: 'Director' },
  { name: 'Abhay Vakil', role: 'Promoter Group' },
]
const MARUTI_PEOPLE: InsiderPerson[] = [
  { name: 'Hisashi Takeuchi', role: 'CEO/MD' },
  { name: 'Rahul Bharti', role: 'KMP' },
  { name: 'Kenichi Ayukawa', role: 'Director' },
  { name: 'Shashank Srivastava', role: 'KMP' },
]

const CONFIGS: Record<string, CompanyConfig> = {
  'RELIANCE.NS': {
    price: {
      startPrice: 480,
      endPrice: 2950,
      volatility: 0.07,
      drawdowns: [{ startMonth: 14, durationMonths: 5, deltaPct: -0.32 }],
    },
    people: RELIANCE_PEOPLE,
    narrative: 'neutral',
    oneLiner:
      'Insider activity is not a major flag. Selling has been frequent but mostly routine, and there is no cluster selling by promoters.',
    mainPositive: 'Promoter family stable; no meaningful exit',
    mainConcern: 'No insider buys despite multiple drawdowns over the period',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Selling-heavy', read: 'Net seller across last 12 months but pace is moderate', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'Very low', read: 'No meaningful buys in last 12 months', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Mostly routine ESOP-linked sells by KMP', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'Quiet', read: 'No activity from key promoter group last 6 months', tone: 'neutral' },
    ],
    finalRead:
      'Insider and deal activity looks neutral. Insider sales appear routine, no cluster sell is visible, and recent bulk deals show institutional rotation rather than exits. No major red flag from this tab.',
    buyMonths: [],
    sellMonths: [6, 18, 28, 38, 48, 60, 76, 88, 102, 112, 116, 119],
  },
  'HDFCBANK.NS': {
    price: {
      startPrice: 700,
      endPrice: 1720,
      volatility: 0.06,
      drawdowns: [{ startMonth: 14, durationMonths: 5, deltaPct: -0.30 }],
    },
    people: HDFCBANK_PEOPLE,
    narrative: 'neutral',
    oneLiner:
      'Insider activity is broadly neutral. Sells are routine and small-scale; no concerning pattern from promoter group or KMP.',
    mainPositive: 'No cluster sells, no large promoter exit',
    mainConcern: 'No open market buying despite post-merger drawdown',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Slightly negative', read: 'Minor net selling, mostly small ticket', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'Very low', read: 'No meaningful insider buys in 12 months', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'KMP-driven, small absolute values', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'Largely quiet', read: 'CEO and CFO quiet since merger close', tone: 'neutral' },
    ],
    finalRead:
      'Insider activity is broadly neutral. The bigger story is institutional accumulation in bulk deals, which is constructive. No cluster sell, no large exit. No red flag from this tab.',
    buyMonths: [],
    sellMonths: [12, 24, 36, 48, 60, 72, 84, 96, 108, 116, 119],
  },
  'INFY.NS': {
    price: {
      startPrice: 700,
      endPrice: 1880,
      volatility: 0.07,
      drawdowns: [
        { startMonth: 14, durationMonths: 4, deltaPct: -0.33 },
        { startMonth: 88, durationMonths: 4, deltaPct: -0.20 },
      ],
    },
    people: INFY_PEOPLE,
    narrative: 'positive',
    oneLiner:
      'Insider signal is constructive. Founder bought during the 2020 drawdown and pattern of sells is routine ESOP-driven.',
    mainPositive: 'Founder open-market buy during 2020 drawdown',
    mainConcern: 'CEO sold a meaningful tranche post earnings — worth a note',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Mixed', read: 'Net seller in last 12m but with two clear buys earlier', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'Selective', read: 'Founder added during drawdowns — strong signal', tone: 'positive' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Largely ESOP exercise + diversification', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'Active', read: 'Decent two-way insider participation', tone: 'positive' },
    ],
    finalRead:
      'Insider and deals signal is constructive. The founder buy during the 2020 drawdown remains the cleanest positive marker. Recent sells are routine and the bulk deal flow is neutral. No red flag.',
    buyMonths: [16, 90],
    sellMonths: [22, 32, 44, 58, 70, 84, 96, 104, 110, 117],
  },
  'TCS.NS': {
    price: {
      startPrice: 1280,
      endPrice: 3850,
      volatility: 0.05,
      drawdowns: [{ startMonth: 14, durationMonths: 4, deltaPct: -0.26 }],
    },
    people: TCS_PEOPLE,
    narrative: 'neutral',
    oneLiner:
      'Insider activity is among the cleanest in the index. Routine sells only; promoter unchanged.',
    mainPositive: 'Tata Sons holding rock steady',
    mainConcern: 'No buy signal despite multi-year compounder profile',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Light selling', read: 'Marginal selling — small absolute values', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'None', read: 'No meaningful insider buys in 5 years', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Mostly ESOP exercise', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'Quiet', read: 'Promoter group has not transacted', tone: 'neutral' },
    ],
    finalRead:
      'Insider and deal signal is neutral and clean. No cluster sells, no large exits, mostly routine ESOP activity. The lack of buys is the only soft spot but consistent with the company profile.',
    buyMonths: [],
    sellMonths: [10, 22, 34, 46, 58, 70, 82, 94, 106, 116, 119],
  },
  'LT.NS': {
    price: {
      startPrice: 1480,
      endPrice: 3580,
      volatility: 0.06,
      drawdowns: [{ startMonth: 14, durationMonths: 5, deltaPct: -0.28 }],
    },
    people: LT_PEOPLE,
    narrative: 'neutral',
    oneLiner:
      'Insider activity is muted. No cluster sell, no clustering of promoter exits.',
    mainPositive: 'No promoter (institutional ownership), no exit overhang',
    mainConcern: 'Almost no insider activity — limited information value',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Quiet', read: 'Very low transaction volume', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'None', read: 'No insider buys in window', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Sparse', read: 'Few isolated KMP-led sells', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'High', read: 'Very low signal from insiders', tone: 'neutral' },
    ],
    finalRead:
      'Insider and deal activity is neutral and sparse. Bulk deals show institutional rotation but no major flag. No red flag, but also limited information value from this tab.',
    buyMonths: [],
    sellMonths: [20, 40, 60, 80, 100, 116],
  },
  'DMART.NS': {
    price: {
      startPrice: 700,
      endPrice: 4180,
      volatility: 0.07,
      drawdowns: [{ startMonth: 14, durationMonths: 4, deltaPct: -0.30 }],
    },
    people: DMART_PEOPLE,
    narrative: 'neutral',
    oneLiner:
      'Insider activity is quiet — typical for a tightly held promoter company.',
    mainPositive: 'Promoter family unchanged, no exit',
    mainConcern: 'Float thinness reflected in light insider activity',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Quiet', read: 'Light KMP-driven sells', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'None', read: 'No insider buys in window', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Few ESOP-linked KMP sells', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'High', read: 'Promoter has not transacted', tone: 'neutral' },
    ],
    finalRead:
      'Insider and deal signal is neutral. No cluster sell or large exit, but volumes are low which limits the signal. Bulk deals show small-scale institutional rotation. No red flag.',
    buyMonths: [],
    sellMonths: [30, 50, 75, 95, 115],
  },
  'TITAN.NS': {
    price: {
      startPrice: 600,
      endPrice: 3520,
      volatility: 0.07,
      drawdowns: [{ startMonth: 14, durationMonths: 4, deltaPct: -0.34 }],
    },
    people: TITAN_PEOPLE,
    narrative: 'positive',
    oneLiner:
      'Insider signal is constructive. Routine sells with one notable buy by a director after correction.',
    mainPositive: 'Director open-market buy after 2020 drawdown',
    mainConcern: 'CFO sells after each strong quarter — pattern, not concern',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Net seller', read: 'Net selling but well-spaced and small', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'Selective', read: 'One meaningful director buy in window', tone: 'positive' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Pattern-driven, no clusters', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'Active', read: 'Healthy two-way insider activity', tone: 'positive' },
    ],
    finalRead:
      'Insider and deals signal is constructive. The director buy after the 2020 drawdown is the cleanest positive marker. Sell pattern is routine and well-spaced. Bulk deals neutral. No red flag.',
    buyMonths: [17],
    sellMonths: [24, 36, 50, 62, 76, 88, 100, 110, 117],
  },
  'BAJFINANCE.NS': {
    price: {
      startPrice: 2200,
      endPrice: 7400,
      volatility: 0.10,
      drawdowns: [
        { startMonth: 14, durationMonths: 4, deltaPct: -0.45 },
        { startMonth: 92, durationMonths: 6, deltaPct: -0.22 },
      ],
    },
    people: BAJFIN_PEOPLE,
    narrative: 'watch',
    oneLiner:
      'Insider signal needs watching. Recent quarter shows time-clustered KMP sells around earnings.',
    mainPositive: 'No promoter exit; promoter holding stable',
    mainConcern: 'Cluster sell by 3 KMPs within a 10-day window',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Selling-heavy', read: 'Sells outpaced buys by 12x in last 12m', tone: 'watch' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'None', read: 'No insider buys in last 24 months', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Cluster (recent)', read: '3 KMPs sold within a 10-day window', tone: 'risky' },
      { key: 'silence', label: 'Insider Silence', value: 'Active', read: 'Insiders very active recently — direction concerning', tone: 'watch' },
    ],
    finalRead:
      'Insider and deals signal is on watch. The cluster sell by three KMPs near earnings is the single concerning marker. Promoter holding is stable, but pattern deserves close monitoring before sizing up.',
    buyMonths: [],
    sellMonths: [22, 38, 54, 68, 82, 96, 108],
    clusterSellMonths: [115, 116, 117],
  },
  'ASIANPAINT.NS': {
    price: {
      startPrice: 600,
      endPrice: 2480,
      volatility: 0.07,
      drawdowns: [
        { startMonth: 14, durationMonths: 4, deltaPct: -0.30 },
        { startMonth: 96, durationMonths: 12, deltaPct: -0.28 },
      ],
    },
    people: ASPAINT_PEOPLE,
    narrative: 'watch',
    oneLiner:
      'Insider signal is mixed. No buys despite a 28% drawdown — insider conviction looks low.',
    mainPositive: 'No cluster sell visible',
    mainConcern: 'Zero open-market buys despite a sustained 28% drawdown',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Selling-light', read: 'Light selling but no buying offset', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'None', read: 'No buying after the recent 28% drawdown', tone: 'risky' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Sells are well-spaced and small', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'High', read: 'Promoter group has been quiet through drawdown', tone: 'watch' },
    ],
    finalRead:
      'Insider and deal signal is mixed. The lack of any open-market buy through a 28% drawdown is the cleanest concern — insiders are signaling no urgency. Sells are routine. Watch zone.',
    buyMonths: [],
    sellMonths: [18, 32, 46, 60, 74, 88, 102, 116],
  },
  'MARUTI.NS': {
    price: {
      startPrice: 3500,
      endPrice: 13000,
      volatility: 0.07,
      drawdowns: [{ startMonth: 14, durationMonths: 4, deltaPct: -0.32 }],
    },
    people: MARUTI_PEOPLE,
    narrative: 'neutral',
    oneLiner:
      'Insider activity is sparse. No cluster, no buying — neutral overall.',
    mainPositive: 'Promoter (Suzuki) holding stable',
    mainConcern: 'No insider buys in window',
    cards: [
      { key: 'net', label: 'Net Insider Activity', value: 'Quiet', read: 'Very low absolute activity', tone: 'neutral' },
      { key: 'buyIntensity', label: 'Buy Intensity', value: 'None', read: 'No insider buys in window', tone: 'watch' },
      { key: 'sellPattern', label: 'Sell Pattern', value: 'Routine', read: 'Few isolated KMP-led sells', tone: 'positive' },
      { key: 'silence', label: 'Insider Silence', value: 'High', read: 'Promoter (Suzuki) does not transact in market', tone: 'neutral' },
    ],
    finalRead:
      'Insider and deal signal is neutral. Promoter is stable, sells are routine, and bulk deals show modest institutional accumulation. No red flag.',
    buyMonths: [],
    sellMonths: [28, 50, 74, 98, 116],
  },
}

const DEFAULT_CONFIG = CONFIGS['RELIANCE.NS']

/* ===== month axis ===== */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function buildMonthDates(): string[] {
  // 121 months ending at current — last point is 2026-05 (current date)
  const out: string[] = []
  // current date = 2026-05; go back 120 months -> 2016-05
  let year = 2016
  let month = 5 // 1-indexed
  for (let i = 0; i < 121; i++) {
    out.push(`${year}-${String(month).padStart(2, '0')}-15`)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }
  return out
}

const MONTH_DATES = buildMonthDates()

/* ===== price series ===== */

function buildPriceSeries(ticker: string, cfg: PriceConfig): PricePoint[] {
  const N = MONTH_DATES.length
  const out: PricePoint[] = []
  // base log-linear interp
  const lnStart = Math.log(cfg.startPrice)
  const lnEnd = Math.log(cfg.endPrice)
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const base = Math.exp(lnStart + (lnEnd - lnStart) * t)
    // drawdown
    let dd = 1
    if (cfg.drawdowns) {
      for (const d of cfg.drawdowns) {
        if (i >= d.startMonth && i < d.startMonth + d.durationMonths) {
          // ramp down + recover
          const phase = (i - d.startMonth) / d.durationMonths
          const intensity = Math.sin(phase * Math.PI) // 0 -> 1 -> 0
          dd *= 1 + d.deltaPct * intensity
        }
      }
    }
    const noise = (seeded(ticker + 'p', i) - 0.5) * 2 * cfg.volatility
    const price = +(base * dd * (1 + noise)).toFixed(2)
    out.push({ date: MONTH_DATES[i], price })
  }
  return out
}

/* ===== insider trades generator ===== */

function classifyTrade(
  type: InsiderType,
  role: InsiderRole,
  value: number,
  isCluster: boolean,
  isAfterDrawdown: boolean,
): { classification: InsiderClassification; note: string } {
  if (type === 'Buy') {
    if (isAfterDrawdown && value >= 8) return { classification: 'Strong Buy', note: 'Open market buy during drawdown — high conviction' }
    if (value >= 4) return { classification: 'Moderate Buy', note: 'Open market accumulation' }
    return { classification: 'Moderate Buy', note: 'Small open market buy' }
  }
  if (isCluster) return { classification: 'Cluster Sell', note: 'Time-clustered with other KMPs — review' }
  if (role === 'Promoter' || role === 'Promoter Group') {
    if (value >= 30) return { classification: 'Meaningful Sell', note: 'Promoter sell — meaningful in size' }
    return { classification: 'Routine Sell', note: 'Small promoter group sell' }
  }
  if (value < 0.5) return { classification: 'Ignore', note: 'Trivial size' }
  if (value >= 6) return { classification: 'Meaningful Sell', note: 'Sized sell — track context' }
  return { classification: 'Routine Sell', note: 'ESOP exercise / diversification' }
}

function isAfterDrawdownMonth(monthIdx: number, cfg: PriceConfig): boolean {
  if (!cfg.drawdowns) return false
  return cfg.drawdowns.some((d) => monthIdx >= d.startMonth && monthIdx <= d.startMonth + d.durationMonths + 1)
}

function buildTrades(ticker: string, cfg: CompanyConfig, prices: PricePoint[]): InsiderTrade[] {
  const trades: InsiderTrade[] = []
  const totalMonths = MONTH_DATES.length

  // buy events
  cfg.buyMonths.forEach((m, i) => {
    if (m >= totalMonths) return
    const person = cfg.people[Math.floor(seeded(ticker + 'buy', i) * cfg.people.length)]
    const r = seeded(ticker + 'buyv', i)
    const value = +(4 + r * 12).toFixed(1)
    const price = prices[m].price
    const { classification, note } = classifyTrade('Buy', person.role, value, false, isAfterDrawdownMonth(m, cfg.price))
    trades.push({ date: prices[m].date, insider: person.name, role: person.role, type: 'Buy', value, price, classification, note })
  })

  // sell events
  cfg.sellMonths.forEach((m, i) => {
    if (m >= totalMonths) return
    const person = cfg.people[Math.floor(seeded(ticker + 'sel', i) * cfg.people.length)]
    const r = seeded(ticker + 'selv', i)
    const value = +(0.6 + r * 14).toFixed(1)
    const price = prices[m].price
    const { classification, note } = classifyTrade('Sell', person.role, value, false, false)
    trades.push({ date: prices[m].date, insider: person.name, role: person.role, type: 'Sell', value, price, classification, note })
  })

  // cluster sells (multiple insiders within a tight window)
  if (cfg.clusterSellMonths) {
    cfg.clusterSellMonths.forEach((m, idx) => {
      if (m >= totalMonths) return
      // pick 3 different insiders for the cluster
      const baseIdx = idx
      for (let k = 0; k < 3; k++) {
        const person = cfg.people[(baseIdx + k) % cfg.people.length]
        const value = +(3 + seeded(ticker + 'clu' + k, idx) * 8).toFixed(1)
        const price = prices[m].price
        const { classification, note } = classifyTrade('Sell', person.role, value, true, false)
        trades.push({ date: prices[m].date, insider: person.name, role: person.role, type: 'Sell', value, price, classification, note })
      }
    })
  }

  // sort by date desc (latest first)
  trades.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return trades
}

/* ===== exports ===== */

export const HORIZON_MONTHS: Record<'1Y' | '2Y' | '5Y' | '10Y' | 'Max', number> = {
  '1Y': 12,
  '2Y': 24,
  '5Y': 60,
  '10Y': 120,
  Max: 121,
}

export function getInsiderDeals(ticker: string): InsiderDealsData {
  const cfg = CONFIGS[ticker] ?? DEFAULT_CONFIG
  const pricePoints = buildPriceSeries(ticker, cfg.price)
  const trades = buildTrades(ticker, cfg, pricePoints)
  const summary = {
    signal: (cfg.narrative === 'positive'
      ? 'Positive'
      : cfg.narrative === 'watch'
      ? 'Watch'
      : cfg.narrative === 'risky'
      ? 'Risky'
      : 'Neutral') as InsiderSignal,
    oneLiner: cfg.oneLiner,
    mainPositive: cfg.mainPositive,
    mainConcern: cfg.mainConcern,
    cards: cfg.cards,
    finalRead: cfg.finalRead,
  }
  return {
    summary,
    pricePoints,
    trades,
    deals: getDeals(ticker),
    dealsRead: getDealsRead(ticker),
  }
}

// month name helper
export function monthLabel(date: string): string {
  const [y, m] = date.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(-2)}`
}
