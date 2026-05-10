export type Exchange = 'NSE' | 'BSE'
export type Country = 'India'

export interface Company {
  name: string
  ticker: string
  exchange: Exchange
  country: Country
}

export type SignalLevel = 'Positive' | 'Watch' | 'Risky' | 'Red Flag'
export type TrendDirection = 'Improving' | 'Stable' | 'Weakening'

export interface OwnershipQuarter {
  quarter: string // e.g. "Q1 FY21"
  promoter: number
  fii: number
  dii: number
  public: number
}

export interface HolderMove {
  name: string
  type: 'FII' | 'DII' | 'MF' | 'Insurance' | 'Retail' | 'Other'
  changePct: number // delta vs prev quarter
  currentPct: number
}

export interface OverviewSignal {
  signal: SignalLevel
  trend: TrendDirection
  oneLiner: string
  sparkline: number[]
  // tile reads
  ownershipTrendRead: string
  holderMovementRead: string
  insiderDealsRead: string
  governanceRead: string
  // recent changes
  recentChanges: {
    positive: string
    negative: string
    unusual: string
  }
  // final analyst note
  buySideRead: string
}

export interface HolderMovementSummary {
  topAccumulator: HolderMove
  topReducer: HolderMove
  newEntries: number
  exits: number
  institutionalBreadth: number // count of institutions
  breadthChange: number // qoq change
}

export interface InsiderDealsSummary {
  insiderSignal: 'Routine' | 'Cluster Buy' | 'Cluster Sell' | 'Mixed'
  insiderBuyValue: number // in INR Cr
  insiderSellValue: number
  bulkDealNet: number // net INR Cr
  blockDealNet: number
  monthlyFlow: { month: string; buy: number; sell: number }[]
}

export interface GovernanceSummary {
  riskLevel: 'Low' | 'Medium' | 'High'
  rptToRevenuePct: number
  rptYoyChange: number // pp change
  auditorChanges: number
  pledgePct: number
  pledgeChange: number
  rptTrend: { quarter: string; rpt: number; revenue: number }[]
}

export interface CompanyOverview {
  signal: OverviewSignal
  ownership20q: OwnershipQuarter[]
  holderMovement: HolderMovementSummary
  insiderDeals: InsiderDealsSummary
  governance: GovernanceSummary
}

export type TabKey = 'overview' | 'trends' | 'insider' | 'governance'

export interface InsightDrawerData {
  title: string
  tab: TabKey
  signalTone: 'positive' | 'watch' | 'risky' | 'red'
  oneLiner: string
  buySideNote: string
  chartType: 'ownership' | 'holderBars' | 'insiderFlow' | 'rptArea'
}

/* ========== Ownership Trends tab ========== */

export type HolderType = 'Promoter' | 'FII' | 'DII' | 'MF' | 'Insurance' | 'Individual'

export type HolderSignal =
  | 'Accumulating'
  | 'Reducing'
  | 'Stable'
  | 'New Entry'
  | 'Exited'
  | 'Watch'

export interface HolderRow {
  name: string
  type: HolderType
  prevPct: number | null // null when New Entry
  currPct: number | null // null when Exited
  changePct: number // for Exited treat as -prevPct, for New Entry as +currPct
  signal: HolderSignal
}

export type HeatmapBucket = 'Promoter' | 'FII' | 'DII' | 'Public' | 'Individual / Others'

export interface HeatmapCell {
  delta: number // pp change
  state: 'up' | 'down' | 'stable' | 'watch'
}

export interface HeatmapRow {
  bucket: HeatmapBucket
  cells: HeatmapCell[] // length = quarters provided
}

export interface BreadthPoint {
  quarter: string
  newEntries: number
  exits: number
  net: number
}

export interface OwnershipTrendsStory {
  status: 'Improving' | 'Stable' | 'Weakening' | 'Risky'
  oneLiner: string
  positiveChange: string
  riskChange: string
  trendAnnotation: string
  breadthRead: string
  finalRead: string
}

export interface OwnershipTrendsData {
  story: OwnershipTrendsStory
  heatmap: { quarters: string[]; rows: HeatmapRow[] }
  holders: HolderRow[]
  breadth: BreadthPoint[]
}

/* ========== Insider & Deals tab ========== */

export type InsiderHorizon = '1Y' | '2Y' | '5Y' | '10Y' | 'Max'

export type InsiderRole =
  | 'Promoter'
  | 'CEO/MD'
  | 'CFO'
  | 'Director'
  | 'KMP'
  | 'Promoter Group'

export type InsiderType = 'Buy' | 'Sell'

export type InsiderClassification =
  | 'Strong Buy'
  | 'Moderate Buy'
  | 'Routine Sell'
  | 'Meaningful Sell'
  | 'Cluster Sell'
  | 'Watch'
  | 'Ignore'

export interface InsiderTrade {
  date: string // YYYY-MM-DD
  insider: string
  role: InsiderRole
  type: InsiderType
  value: number // INR Cr
  price: number // per share INR
  classification: InsiderClassification
  note: string // short read like "ESOP-driven", "Diversification", "Open market accumulation"
}

export interface PricePoint {
  date: string // YYYY-MM-DD
  price: number
}

export type InsiderSignal = 'Positive' | 'Neutral' | 'Watch' | 'Risky'

export interface InsiderSignalCard {
  key: 'net' | 'buyIntensity' | 'sellPattern' | 'silence'
  label: string
  value: string
  read: string
  tone: 'positive' | 'neutral' | 'watch' | 'risky'
}

export interface InsiderSignalSummary {
  signal: InsiderSignal
  oneLiner: string
  mainPositive: string
  mainConcern: string
  cards: InsiderSignalCard[]
  finalRead: string
}

export type DealType = 'Bulk' | 'Block'

export type DealSignal =
  | 'Institutional Accumulation'
  | 'Large Exit'
  | 'Churn'
  | 'Unusual'
  | 'Neutral'

export interface BulkBlockDeal {
  date: string
  buyer: string
  seller: string
  dealType: DealType
  value: number // INR Cr
  premiumPct: number // vs market — negative = discount
  signal: DealSignal
}

export interface InsiderDealsData {
  summary: InsiderSignalSummary
  pricePoints: PricePoint[] // monthly, 10y
  trades: InsiderTrade[] // 10y span
  deals: BulkBlockDeal[]
  dealsRead: string
}
