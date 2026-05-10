import type {
  CompanyOverview,
  GovernanceData,
  InsiderDealsData,
  OwnershipTrendsData,
} from '../types'

export type VerdictCall = 'Strong Buy' | 'Buy' | 'Hold' | 'Trim' | 'Avoid'
export type Conviction = 'High' | 'Medium' | 'Low'
export type DimensionTone = 'positive' | 'neutral' | 'watch' | 'risky'

export interface VerdictDimension {
  key: 'ownership' | 'trend' | 'insider' | 'governance'
  label: string
  signal: string // verbatim signal label from each tab
  tone: DimensionTone
  score: number // 0..3
  read: string // short read for the dimension
}

export interface InvestmentVerdict {
  call: VerdictCall
  conviction: Conviction
  oneLiner: string
  totalScore: number // 0..12
  dimensions: VerdictDimension[]
  positionGuidance: string
  watchItems: string[]
}

/* ===== scoring ===== */

function ownershipScore(o: CompanyOverview): { score: number; tone: DimensionTone; read: string } {
  switch (o.signal.signal) {
    case 'Positive':
      return { score: 3, tone: 'positive', read: o.signal.ownershipTrendRead }
    case 'Watch':
      return { score: 2, tone: 'watch', read: o.signal.ownershipTrendRead }
    case 'Risky':
      return { score: 1, tone: 'risky', read: o.signal.ownershipTrendRead }
    case 'Red Flag':
    default:
      return { score: 0, tone: 'risky', read: o.signal.ownershipTrendRead }
  }
}

function trendScore(t: OwnershipTrendsData): { score: number; tone: DimensionTone; read: string } {
  switch (t.story.status) {
    case 'Improving':
      return { score: 3, tone: 'positive', read: t.story.oneLiner }
    case 'Stable':
      return { score: 2, tone: 'neutral', read: t.story.oneLiner }
    case 'Weakening':
      return { score: 1, tone: 'watch', read: t.story.oneLiner }
    case 'Risky':
    default:
      return { score: 0, tone: 'risky', read: t.story.oneLiner }
  }
}

function insiderScore(i: InsiderDealsData): { score: number; tone: DimensionTone; read: string } {
  switch (i.summary.signal) {
    case 'Positive':
      return { score: 3, tone: 'positive', read: i.summary.oneLiner }
    case 'Neutral':
      return { score: 2, tone: 'neutral', read: i.summary.oneLiner }
    case 'Watch':
      return { score: 1, tone: 'watch', read: i.summary.oneLiner }
    case 'Risky':
    default:
      return { score: 0, tone: 'risky', read: i.summary.oneLiner }
  }
}

function governanceScore(g: GovernanceData): { score: number; tone: DimensionTone; read: string } {
  switch (g.summary.signal) {
    case 'Low Risk':
      return { score: 3, tone: 'positive', read: g.summary.oneLiner }
    case 'Watch':
      return { score: 2, tone: 'watch', read: g.summary.oneLiner }
    case 'High Risk':
      return { score: 1, tone: 'risky', read: g.summary.oneLiner }
    case 'Red Flag':
    default:
      return { score: 0, tone: 'risky', read: g.summary.oneLiner }
  }
}

/* ===== verdict ===== */

function callFromScore(total: number): VerdictCall {
  if (total >= 11) return 'Strong Buy'
  if (total >= 9) return 'Buy'
  if (total >= 6) return 'Hold'
  if (total >= 3) return 'Trim'
  return 'Avoid'
}

function convictionFromDispersion(scores: number[]): Conviction {
  // measure spread: stdev-ish. high conviction = low spread.
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const sumSq = scores.reduce((a, b) => a + (b - mean) ** 2, 0)
  const variance = sumSq / scores.length
  if (variance <= 0.4) return 'High'
  if (variance <= 1.2) return 'Medium'
  return 'Low'
}

function oneLineFromCall(call: VerdictCall, conviction: Conviction): string {
  const ground =
    call === 'Strong Buy'
      ? 'All four ownership dimensions point in the same constructive direction.'
      : call === 'Buy'
      ? 'Most signals are constructive, with one or two soft spots that are manageable.'
      : call === 'Hold'
      ? 'Signals are mixed. Stay sized but avoid adding until the soft markers stabilize.'
      : call === 'Trim'
      ? 'More red than green. Trim weight; do not reverse the position fully unless the trajectory worsens.'
      : 'The composite signal is poor. Avoid fresh exposure until ownership and governance markers stabilize.'
  const conv =
    conviction === 'High'
      ? ' Conviction is high — signals are aligned.'
      : conviction === 'Medium'
      ? ' Conviction is moderate — there is some signal dispersion.'
      : ' Conviction is low — signals are conflicting.'
  return ground + conv
}

function positionGuidanceFromCall(call: VerdictCall): string {
  switch (call) {
    case 'Strong Buy':
      return 'Size to full conviction weight. Ownership signal supports adding through pullbacks.'
    case 'Buy':
      return 'Build to a normal position. Add on weakness rather than chasing.'
    case 'Hold':
      return 'Hold current weight. Avoid sizing up until the watch markers move back to normal.'
    case 'Trim':
      return 'Reduce position size by a third to a half. Reassess on the next quarter.'
    case 'Avoid':
      return 'No fresh exposure. If currently held, reduce sharply on any rallies.'
  }
}

function watchItemsFrom(
  o: CompanyOverview,
  i: InsiderDealsData,
  g: GovernanceData,
): string[] {
  const out: string[] = []
  if (g.summary.signal === 'Watch' || g.summary.signal === 'High Risk' || g.summary.signal === 'Red Flag')
    out.push(g.summary.mainConcern)
  if (i.summary.signal === 'Watch' || i.summary.signal === 'Risky') out.push(i.summary.mainConcern)
  if (o.signal.signal === 'Watch' || o.signal.signal === 'Risky' || o.signal.signal === 'Red Flag')
    out.push(o.signal.recentChanges.negative)
  return out.slice(0, 3)
}

export function computeVerdict(
  overview: CompanyOverview,
  trends: OwnershipTrendsData,
  insider: InsiderDealsData,
  governance: GovernanceData,
): InvestmentVerdict {
  const oS = ownershipScore(overview)
  const tS = trendScore(trends)
  const iS = insiderScore(insider)
  const gS = governanceScore(governance)

  const dimensions: VerdictDimension[] = [
    {
      key: 'ownership',
      label: 'Ownership Signal',
      signal: overview.signal.signal,
      tone: oS.tone,
      score: oS.score,
      read: oS.read,
    },
    {
      key: 'trend',
      label: 'Ownership Trend',
      signal: trends.story.status,
      tone: tS.tone,
      score: tS.score,
      read: tS.read,
    },
    {
      key: 'insider',
      label: 'Insider & Deals',
      signal: insider.summary.signal,
      tone: iS.tone,
      score: iS.score,
      read: iS.read,
    },
    {
      key: 'governance',
      label: 'Governance',
      signal: governance.summary.signal,
      tone: gS.tone,
      score: gS.score,
      read: gS.read,
    },
  ]

  const totalScore = dimensions.reduce((a, d) => a + d.score, 0)
  const call = callFromScore(totalScore)
  const conviction = convictionFromDispersion(dimensions.map((d) => d.score))

  return {
    call,
    conviction,
    oneLiner: oneLineFromCall(call, conviction),
    totalScore,
    dimensions,
    positionGuidance: positionGuidanceFromCall(call),
    watchItems: watchItemsFrom(overview, insider, governance),
  }
}
