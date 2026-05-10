import type {
  GovernanceCard,
  GovernanceData,
  GovernanceSignal,
  GovernanceSummary,
  GovernanceTrendStripItem,
  RPTFlowEntry,
  RPTSignal,
  RPTTrendPoint,
  RelatedPartyTransaction,
} from '../types'

const PERIODS = ['FY19', 'FY20', 'FY21', 'FY22', 'FY23', 'FY24', 'FY25']

interface PartyTemplate {
  counterparty: string
  relationship: RelatedPartyTransaction['relationship']
  transactionType: RelatedPartyTransaction['transactionType']
  baseValue: number // INR Cr in latest period
  growth: number // YoY growth rate
  balance: number // outstanding INR Cr
}

interface CompanyConfig {
  signal: GovernanceSignal
  oneLiner: string
  mainPositive: string
  mainConcern: string
  finalRead: string
  baseRevenueFY25: number // INR Cr
  revenueCagr: number // 6yr cagr
  baseRptPctFY19: number // RPT %
  rptDriftPerYear: number // pp
  cards: GovernanceCard[]
  strip: GovernanceTrendStripItem[]
  parties: PartyTemplate[]
}

const CONFIGS: Record<string, CompanyConfig> = {
  'RELIANCE.NS': {
    signal: 'Watch',
    oneLiner:
      'RPT value has grown faster than revenue for 3 of last 5 periods, but receivables remain controlled.',
    mainPositive: 'Receivables intensity has not deteriorated despite RPT growth',
    mainConcern: 'One subsidiary cluster is becoming more material year-on-year',
    finalRead:
      'Governance risk is at watch level. RPT growth has outpaced revenue in three of the last five periods, and one subsidiary is becoming materially larger. Receivables are still manageable, so this is a watch item rather than a thesis-breaker. Monitor RPT-to-revenue trajectory before sizing up.',
    baseRevenueFY25: 920000,
    revenueCagr: 0.12,
    baseRptPctFY19: 7.0,
    rptDriftPerYear: 0.5,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'Outpacing', read: 'Faster than revenue in 3 of 5 periods', tone: 'watch' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '9.4%', read: 'Above 5-yr median, in watch zone', tone: 'watch' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Controlled', read: 'Days outstanding flat YoY', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Rising', read: 'Top counterparty up to 38% of RPT', tone: 'watch' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Worsening', read: 'RPT % rising 2 yrs running' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Balance days flat' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Worsening', read: 'Top 1 share rising' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Stable', read: 'Detailed schedules in AR' },
    ],
    parties: [
      { counterparty: 'Reliance Retail Ventures', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 18400, growth: 0.18, balance: 2850 },
      { counterparty: 'Reliance Jio Infocomm', relationship: 'Subsidiary', transactionType: 'Service Expense', baseValue: 14200, growth: 0.22, balance: 4120 },
      { counterparty: 'Reliance BP Mobility', relationship: 'Joint Venture', transactionType: 'Goods Purchase', baseValue: 8900, growth: 0.06, balance: 1180 },
      { counterparty: 'Reliance O2C', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 6200, growth: 0.04, balance: 880 },
      { counterparty: 'Network18 Media', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 1840, growth: 0.10, balance: 220 },
      { counterparty: 'Reliance Industrial Investments', relationship: 'Subsidiary', transactionType: 'Investment', baseValue: 3200, growth: 0.32, balance: 0 },
      { counterparty: 'Mumbai Indians', relationship: 'Subsidiary', transactionType: 'Royalty', baseValue: 86, growth: 0.08, balance: 14 },
    ],
  },
  'HDFCBANK.NS': {
    signal: 'Low Risk',
    oneLiner:
      'Governance risk is low. RPT is dominated by routine intra-group banking transactions, well disclosed and stable.',
    mainPositive: 'No related-party loan or guarantee outside normal banking course',
    mainConcern: 'Increased intra-group activity post HDFC merger — natural but worth monitoring',
    finalRead:
      'Governance risk is low. The RPT base has expanded post the HDFC Ltd merger, but the activity is routine intra-group banking. Disclosure is strong, balances are tracked, and concentration is acceptable. No action required from this tab.',
    baseRevenueFY25: 285000,
    revenueCagr: 0.16,
    baseRptPctFY19: 2.1,
    rptDriftPerYear: 0.18,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'In line', read: 'RPT and revenue growth tracking together', tone: 'positive' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '3.2%', read: 'Below sector median', tone: 'positive' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Routine', read: 'Banking-course balances only', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Diversified', read: 'No single party above 20%', tone: 'positive' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Stable', read: 'Within historical band' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Tight monitoring' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Improving', read: 'Spread across subsidiaries' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Improving', read: 'Best-in-class disclosures' },
    ],
    parties: [
      { counterparty: 'HDFC Life Insurance', relationship: 'Associate', transactionType: 'Service Income', baseValue: 1840, growth: 0.10, balance: 280 },
      { counterparty: 'HDFC ERGO General Insurance', relationship: 'Associate', transactionType: 'Service Income', baseValue: 980, growth: 0.08, balance: 142 },
      { counterparty: 'HDFC Asset Management', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 720, growth: 0.06, balance: 88 },
      { counterparty: 'HDFC Securities', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 540, growth: 0.04, balance: 62 },
      { counterparty: 'HDB Financial Services', relationship: 'Subsidiary', transactionType: 'Loan Given', baseValue: 4200, growth: 0.18, balance: 2400 },
      { counterparty: 'KMP — Whole Time Directors', relationship: 'KMP / Director', transactionType: 'Service Expense', baseValue: 88, growth: 0.06, balance: 0 },
    ],
  },
  'INFY.NS': {
    signal: 'Low Risk',
    oneLiner:
      'Governance risk is low. RPT is small in absolute terms and the sub-portfolio is stable.',
    mainPositive: 'RPT below 3% of revenue, with strong disclosures',
    mainConcern: 'None material — minor uptick in BPM-related intra-group services',
    finalRead:
      'Governance risk is low. RPT is well within sector norms, balances are negligible, and disclosure quality is high. No risk overlay needed from this tab.',
    baseRevenueFY25: 162000,
    revenueCagr: 0.12,
    baseRptPctFY19: 2.0,
    rptDriftPerYear: 0.06,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'In line', read: 'RPT roughly tracking revenue', tone: 'positive' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '2.4%', read: 'Below sector average', tone: 'positive' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Negligible', read: 'Balances small absolute', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Low', read: 'No single party above 15%', tone: 'positive' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Stable', read: 'Range-bound for 4 yrs' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Negligible' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Stable', read: 'Even spread' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Improving', read: 'Detailed AR schedules' },
    ],
    parties: [
      { counterparty: 'Infosys BPM', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 1240, growth: 0.10, balance: 168 },
      { counterparty: 'EdgeVerve Systems', relationship: 'Subsidiary', transactionType: 'Service Expense', baseValue: 880, growth: 0.06, balance: 124 },
      { counterparty: 'Infosys McCamish Systems', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 540, growth: 0.04, balance: 72 },
      { counterparty: 'Infosys Public Services', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 412, growth: 0.06, balance: 56 },
      { counterparty: 'Infosys Consulting AG', relationship: 'Subsidiary', transactionType: 'Service Expense', baseValue: 248, growth: 0.04, balance: 32 },
      { counterparty: 'KMP — Executives', relationship: 'KMP / Director', transactionType: 'Service Expense', baseValue: 64, growth: 0.04, balance: 0 },
    ],
  },
  'TCS.NS': {
    signal: 'Low Risk',
    oneLiner:
      'Governance risk is low. RPT is small as a percent of revenue and dominated by routine subsidiary activity.',
    mainPositive: 'Tata Sons holding is passive — no operating RPT pressure',
    mainConcern: 'None material',
    finalRead:
      'Governance risk is low. RPT is well-disclosed, small as a percent of revenue, and the Tata Sons relationship is passive in nature. No risk overlay needed from this tab.',
    baseRevenueFY25: 246000,
    revenueCagr: 0.10,
    baseRptPctFY19: 1.6,
    rptDriftPerYear: 0.04,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'In line', read: 'RPT growing slower than revenue', tone: 'positive' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '1.8%', read: 'Among the lowest in the index', tone: 'positive' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Routine', read: 'Negligible balances outstanding', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Diversified', read: 'Spread across global subs', tone: 'positive' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Stable', read: 'Cleanly stable' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Small absolute' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Improving', read: 'Wider spread YoY' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Improving', read: 'Best-in-class' },
    ],
    parties: [
      { counterparty: 'Tata Consultancy Services Asia Pacific', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 1840, growth: 0.06, balance: 168 },
      { counterparty: 'Tata Consultancy Services UK', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 1620, growth: 0.04, balance: 148 },
      { counterparty: 'Tata America Holdings', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 1260, growth: 0.04, balance: 124 },
      { counterparty: 'Tata Sons Pvt Ltd', relationship: 'Holding Company', transactionType: 'Service Expense', baseValue: 184, growth: 0.04, balance: 28 },
      { counterparty: 'CMC Americas', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 248, growth: 0.04, balance: 32 },
      { counterparty: 'Tata BSS', relationship: 'Associate', transactionType: 'Service Expense', baseValue: 88, growth: 0.06, balance: 12 },
    ],
  },
  'LT.NS': {
    signal: 'Low Risk',
    oneLiner:
      'Governance risk is low. Most RPT is intra-group with operating subsidiaries; balances are well controlled.',
    mainPositive: 'No promoter overhang — RPT is purely operating',
    mainConcern: 'L&T Infotech (LTIMindtree) accounts for a large share — not a risk yet',
    finalRead:
      'Governance risk is low. RPT is operating in nature and well disclosed. The institutional structure of L&T means there is no promoter overhang. No action needed from this tab.',
    baseRevenueFY25: 224000,
    revenueCagr: 0.14,
    baseRptPctFY19: 3.2,
    rptDriftPerYear: 0.18,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'In line', read: 'RPT and revenue growing together', tone: 'positive' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '4.1%', read: 'Slightly above median, well-explained', tone: 'positive' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Routine', read: 'Days outstanding stable', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Moderate', read: 'LTIMindtree is largest counterparty', tone: 'neutral' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Stable', read: 'Within band' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Healthy turnover' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Stable', read: 'No new concentration' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Improving', read: 'Detailed segment-wise schedules' },
    ],
    parties: [
      { counterparty: 'LTIMindtree', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 4860, growth: 0.14, balance: 480 },
      { counterparty: 'L&T Technology Services', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 2420, growth: 0.10, balance: 268 },
      { counterparty: 'L&T Finance Holdings', relationship: 'Subsidiary', transactionType: 'Service Expense', baseValue: 1420, growth: 0.06, balance: 188 },
      { counterparty: 'L&T Hydrocarbon Engineering', relationship: 'Subsidiary', transactionType: 'Service Expense', baseValue: 1820, growth: 0.06, balance: 220 },
      { counterparty: 'L&T Construction Equipment', relationship: 'Joint Venture', transactionType: 'Goods Purchase', baseValue: 480, growth: 0.04, balance: 56 },
      { counterparty: 'L&T Infotech Saudi', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 268, growth: 0.06, balance: 32 },
    ],
  },
  'DMART.NS': {
    signal: 'Watch',
    oneLiner:
      'Governance risk is at watch. RPT is moderate in absolute terms, but the share has trended up faster than revenue.',
    mainPositive: 'Receivables and outstandings are tightly controlled',
    mainConcern: 'RPT % of revenue has drifted up steadily for 3 years',
    finalRead:
      'Governance risk is at watch level. RPT share has crept up steadily, driven by intra-group services and lease arrangements with promoter-linked entities. No single party is dominant, but the trajectory deserves monitoring. Receivables intensity is fine — this is a trajectory watch, not a present concern.',
    baseRevenueFY25: 53000,
    revenueCagr: 0.20,
    baseRptPctFY19: 3.6,
    rptDriftPerYear: 0.40,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'Outpacing', read: 'RPT growing 1.4x revenue', tone: 'watch' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '5.6%', read: 'Up from 3.6% in FY19', tone: 'watch' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Controlled', read: 'Working capital tight', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Spread', read: 'No counterparty above 25%', tone: 'positive' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Worsening', read: 'Drifting up 3 yrs' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Tight working capital' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Stable', read: 'Even spread' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Stable', read: 'Standard disclosures' },
    ],
    parties: [
      { counterparty: 'Avenue E-Commerce', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 1240, growth: 0.32, balance: 168 },
      { counterparty: 'Bright Star Investments', relationship: 'Promoter Entity', transactionType: 'Lease', baseValue: 280, growth: 0.18, balance: 84 },
      { counterparty: 'Damani Estates and Finance', relationship: 'Promoter Entity', transactionType: 'Lease', baseValue: 188, growth: 0.16, balance: 62 },
      { counterparty: 'Avenue Supermarts (Sri Lanka)', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 88, growth: 0.10, balance: 18 },
      { counterparty: 'Reflect Holdings', relationship: 'Promoter Entity', transactionType: 'Lease', baseValue: 124, growth: 0.12, balance: 40 },
      { counterparty: 'KMP — Executives', relationship: 'KMP / Director', transactionType: 'Service Expense', baseValue: 38, growth: 0.06, balance: 0 },
    ],
  },
  'TITAN.NS': {
    signal: 'Low Risk',
    oneLiner:
      'Governance risk is low. RPT is dominated by routine subsidiary and Tata-group transactions, well within norms.',
    mainPositive: 'Royalty and IP-licensing structure is transparent',
    mainConcern: 'None material',
    finalRead:
      'Governance risk is low. RPT is operating in nature and entirely within Tata-group norms. Disclosure is strong and balances are routine. No action needed from this tab.',
    baseRevenueFY25: 51000,
    revenueCagr: 0.18,
    baseRptPctFY19: 2.6,
    rptDriftPerYear: 0.06,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'In line', read: 'RPT and revenue growing together', tone: 'positive' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '2.9%', read: 'Below sector average', tone: 'positive' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Routine', read: 'Balances stable YoY', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Diversified', read: 'No single party above 22%', tone: 'positive' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Stable', read: 'Within historical band' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Routine' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Stable', read: 'Even spread' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Improving', read: 'Detailed schedules' },
    ],
    parties: [
      { counterparty: 'Titan Engineering & Automation', relationship: 'Subsidiary', transactionType: 'Service Expense', baseValue: 720, growth: 0.10, balance: 88 },
      { counterparty: 'CaratLane Trading Pvt Ltd', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 480, growth: 0.18, balance: 62 },
      { counterparty: 'Tata Sons Pvt Ltd', relationship: 'Holding Company', transactionType: 'Royalty', baseValue: 220, growth: 0.06, balance: 28 },
      { counterparty: 'Tata Capital', relationship: 'Common Director', transactionType: 'Service Expense', baseValue: 88, growth: 0.04, balance: 12 },
      { counterparty: 'Titan Watches Manufacturing', relationship: 'Subsidiary', transactionType: 'Goods Purchase', baseValue: 348, growth: 0.06, balance: 42 },
      { counterparty: 'KMP — Executives', relationship: 'KMP / Director', transactionType: 'Service Expense', baseValue: 28, growth: 0.04, balance: 0 },
    ],
  },
  'BAJFINANCE.NS': {
    signal: 'Watch',
    oneLiner:
      'Governance risk is at watch. RPT is moderate, but a Bajaj-group financial services counterparty has scaled up notably.',
    mainPositive: 'Disclosure quality remains strong; no opaque transactions',
    mainConcern: 'Intra-group financing flows have grown faster than revenue',
    finalRead:
      'Governance risk is at watch. The Bajaj-group financial services structure means a meaningful share of RPT is intra-group financing, which has scaled. Disclosures are strong and there are no opaque arrangements, but the trajectory deserves monitoring.',
    baseRevenueFY25: 56000,
    revenueCagr: 0.22,
    baseRptPctFY19: 4.6,
    rptDriftPerYear: 0.30,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'Outpacing', read: 'RPT growing 1.3x revenue', tone: 'watch' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '6.4%', read: 'Up from 4.6% in FY19', tone: 'watch' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Watch', read: 'Outstanding balances trending up', tone: 'watch' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Moderate', read: 'Bajaj Finserv is largest counterparty', tone: 'neutral' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Worsening', read: 'Drifting up' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Worsening', read: 'Building up' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Stable', read: 'Bajaj Finserv anchor' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Stable', read: 'Detailed disclosures' },
    ],
    parties: [
      { counterparty: 'Bajaj Finserv', relationship: 'Holding Company', transactionType: 'Service Expense', baseValue: 980, growth: 0.18, balance: 280 },
      { counterparty: 'Bajaj Allianz Life', relationship: 'Common Director', transactionType: 'Service Income', baseValue: 720, growth: 0.16, balance: 168 },
      { counterparty: 'Bajaj Allianz General', relationship: 'Common Director', transactionType: 'Service Income', baseValue: 540, growth: 0.14, balance: 124 },
      { counterparty: 'Bajaj Housing Finance', relationship: 'Subsidiary', transactionType: 'Loan Given', baseValue: 1840, growth: 0.32, balance: 880 },
      { counterparty: 'Bajaj Financial Securities', relationship: 'Subsidiary', transactionType: 'Service Income', baseValue: 280, growth: 0.18, balance: 62 },
      { counterparty: 'KMP — Promoter Group', relationship: 'KMP / Director', transactionType: 'Service Expense', baseValue: 88, growth: 0.06, balance: 0 },
    ],
  },
  'ASIANPAINT.NS': {
    signal: 'High Risk',
    oneLiner:
      'Governance risk is elevated. RPT has grown materially faster than revenue and one promoter-linked counterparty is scaling up.',
    mainPositive: 'No auditor change in last 5 years; disclosures detailed',
    mainConcern: 'Promoter-linked party has grown faster than revenue for 4 straight years',
    finalRead:
      'Governance risk is elevated. RPT % of revenue has drifted from 4.0% to 7.2% over five years, and one promoter-linked counterparty has scaled meaningfully. Disclosures are detailed but the trajectory matters more than the level. Trim or hold; avoid sizing up until the trajectory normalises.',
    baseRevenueFY25: 35400,
    revenueCagr: 0.10,
    baseRptPctFY19: 4.0,
    rptDriftPerYear: 0.60,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'Outpacing fast', read: 'RPT growing 1.7x revenue YoY', tone: 'risky' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '7.2%', read: 'Up from 4.0% in FY19', tone: 'watch' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Watch', read: 'Days outstanding ticking up', tone: 'watch' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Concentrated', read: 'One promoter entity is 41% of RPT', tone: 'risky' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Worsening', read: 'Drifting up 4 yrs' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Worsening', read: 'Receivables building' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Worsening', read: 'Top 1 share rising' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Stable', read: 'Detailed but watch level' },
    ],
    parties: [
      { counterparty: 'Hitech Plast Ltd', relationship: 'Promoter Entity', transactionType: 'Goods Purchase', baseValue: 1860, growth: 0.28, balance: 640 },
      { counterparty: 'Asian Paints Industrial Coatings', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 480, growth: 0.10, balance: 88 },
      { counterparty: 'Asian Paints (International)', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 720, growth: 0.06, balance: 124 },
      { counterparty: 'Sleek International', relationship: 'Subsidiary', transactionType: 'Goods Purchase', baseValue: 248, growth: 0.18, balance: 56 },
      { counterparty: 'Causeway Paints Lanka', relationship: 'Subsidiary', transactionType: 'Goods Sale', baseValue: 168, growth: 0.04, balance: 24 },
      { counterparty: 'KMP — Promoter Group', relationship: 'Promoter Entity', transactionType: 'Royalty', baseValue: 88, growth: 0.06, balance: 0 },
    ],
  },
  'MARUTI.NS': {
    signal: 'Low Risk',
    oneLiner:
      'Governance risk is low. RPT is dominated by parent (Suzuki) routine arrangements, with strong disclosures.',
    mainPositive: 'Royalty arrangement with Suzuki is well-disclosed and reviewed',
    mainConcern: 'Parent royalty payments are large but covered in normal course',
    finalRead:
      'Governance risk is low. The RPT base is dominated by parent (Suzuki) royalty and goods arrangements which are routine, well-disclosed, and reviewed by the audit committee. No risk overlay needed from this tab.',
    baseRevenueFY25: 156000,
    revenueCagr: 0.10,
    baseRptPctFY19: 4.4,
    rptDriftPerYear: 0.06,
    cards: [
      { key: 'rptGrowth', label: 'RPT Growth Trend', value: 'In line', read: 'RPT and revenue growing in step', tone: 'positive' },
      { key: 'rptShare', label: 'RPT % of Revenue', value: '4.8%', read: 'Stable; parent-driven structure', tone: 'positive' },
      { key: 'receivables', label: 'Receivables Risk', value: 'Routine', read: 'Days outstanding flat', tone: 'positive' },
      { key: 'concentration', label: 'Counterparty Concentration', value: 'Concentrated by design', read: 'Parent arrangement is dominant', tone: 'neutral' },
    ],
    strip: [
      { key: 'rptIntensity', label: 'RPT intensity', direction: 'Stable', read: 'Within historical band' },
      { key: 'outstandingBalance', label: 'Outstanding balance', direction: 'Stable', read: 'Routine' },
      { key: 'concentration', label: 'Counterparty concentration', direction: 'Stable', read: 'Parent-driven' },
      { key: 'disclosureQuality', label: 'Disclosure quality', direction: 'Improving', read: 'Detailed parent-wise schedules' },
    ],
    parties: [
      { counterparty: 'Suzuki Motor Corporation', relationship: 'Holding Company', transactionType: 'Royalty', baseValue: 4200, growth: 0.06, balance: 480 },
      { counterparty: 'Suzuki Motor Gujarat', relationship: 'Subsidiary', transactionType: 'Goods Purchase', baseValue: 12400, growth: 0.10, balance: 1820 },
      { counterparty: 'Maruti Suzuki Toyotsu (MSTI)', relationship: 'Joint Venture', transactionType: 'Goods Purchase', baseValue: 1860, growth: 0.04, balance: 248 },
      { counterparty: 'Suzuki Motorcycle India', relationship: 'Common Director', transactionType: 'Goods Sale', baseValue: 480, growth: 0.06, balance: 62 },
      { counterparty: 'Plastic Omnium Auto Inergy India', relationship: 'Joint Venture', transactionType: 'Goods Purchase', baseValue: 348, growth: 0.04, balance: 42 },
      { counterparty: 'KMP — Executives', relationship: 'KMP / Director', transactionType: 'Service Expense', baseValue: 88, growth: 0.04, balance: 0 },
    ],
  },
}

const DEFAULT = CONFIGS['RELIANCE.NS']

/* ===== trend builder ===== */

function buildTrend(cfg: CompanyConfig): RPTTrendPoint[] {
  // build revenue back from FY25 using cagr
  const out: RPTTrendPoint[] = []
  const N = PERIODS.length
  const revenues: number[] = []
  for (let i = 0; i < N; i++) {
    const yearsBack = N - 1 - i
    revenues.push(cfg.baseRevenueFY25 / Math.pow(1 + cfg.revenueCagr, yearsBack))
  }
  // RPT % drifts up from base
  const rptPcts: number[] = []
  for (let i = 0; i < N; i++) rptPcts.push(cfg.baseRptPctFY19 + cfg.rptDriftPerYear * i)
  // build values
  for (let i = 0; i < N; i++) {
    const revenue = +revenues[i].toFixed(0)
    const rpt = +(revenue * (rptPcts[i] / 100)).toFixed(0)
    const rptYoy = i === 0 ? 0 : +((rpt / out[i - 1].rpt - 1) * 100).toFixed(1)
    const revenueYoy = i === 0 ? 0 : +((revenue / out[i - 1].revenue - 1) * 100).toFixed(1)
    out.push({
      period: PERIODS[i],
      rpt,
      revenue,
      rptPctRevenue: +rptPcts[i].toFixed(2),
      rptYoy,
      revenueYoy,
      outpacing: rptYoy > revenueYoy + 1.0,
    })
  }
  return out
}

/* ===== parties builder ===== */

function classifyParty(p: PartyTemplate, totalCurrent: number): RPTSignal {
  const share = p.baseValue / totalCurrent
  if (p.growth >= 0.25 && share >= 0.20) return 'High Risk'
  if (share >= 0.30) return 'Concentrated'
  if (p.growth >= 0.20) return 'Rising Fast'
  if (p.growth >= 0.10) return 'Watch'
  return 'Normal'
}

function buildParties(cfg: CompanyConfig): RelatedPartyTransaction[] {
  const totalCurrent = cfg.parties.reduce((a, p) => a + p.baseValue, 0)
  const out: RelatedPartyTransaction[] = cfg.parties.map((p) => {
    const prev = +(p.baseValue / (1 + p.growth)).toFixed(0)
    const change = +((p.baseValue / prev - 1) * 100).toFixed(1)
    return {
      counterparty: p.counterparty,
      relationship: p.relationship,
      transactionType: p.transactionType,
      currentValue: p.baseValue,
      prevValue: prev,
      changePct: change,
      balanceOutstanding: p.balance,
      signal: classifyParty(p, totalCurrent),
    }
  })
  // sort by current value desc
  out.sort((a, b) => b.currentValue - a.currentValue)
  return out
}

/* ===== flows ===== */

function buildFlows(parties: RelatedPartyTransaction[]): RPTFlowEntry[] {
  const sortedByValue = [...parties].sort((a, b) => b.currentValue - a.currentValue)
  const sortedByBalance = [...parties].sort((a, b) => b.balanceOutstanding - a.balanceOutstanding)
  const sortedByGrowth = [...parties].sort((a, b) => b.changePct - a.changePct)

  const largest = sortedByValue[0]
  const balance = sortedByBalance[0]
  const growth = sortedByGrowth[0]

  return [
    {
      flavor: 'largest_txn',
      counterparty: largest.counterparty,
      relationship: largest.relationship,
      transactionType: largest.transactionType,
      value: largest.currentValue,
      caption: `Largest related-party transaction this period`,
    },
    {
      flavor: 'largest_balance',
      counterparty: balance.counterparty,
      relationship: balance.relationship,
      transactionType: balance.transactionType,
      value: balance.balanceOutstanding,
      caption: `Largest balance outstanding`,
    },
    {
      flavor: 'fastest_growing',
      counterparty: growth.counterparty,
      relationship: growth.relationship,
      transactionType: growth.transactionType,
      value: growth.currentValue,
      caption: `Fastest-growing counterparty (+${growth.changePct.toFixed(1)}% YoY)`,
    },
  ]
}

export function getGovernance(ticker: string): GovernanceData {
  const cfg = CONFIGS[ticker] ?? DEFAULT
  const trend = buildTrend(cfg)
  const parties = buildParties(cfg)
  const summary: GovernanceSummary = {
    signal: cfg.signal,
    oneLiner: cfg.oneLiner,
    mainPositive: cfg.mainPositive,
    mainConcern: cfg.mainConcern,
    finalRead: cfg.finalRead,
    cards: cfg.cards,
    strip: cfg.strip,
  }
  const flows = buildFlows(parties)
  return { summary, trend, parties, flows }
}
