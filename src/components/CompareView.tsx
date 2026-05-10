import { useMemo } from 'react'
import {
  ArrowLeft,
  ArrowLeftRight,
  Gauge,
  ShieldAlert,
  Sparkles,
  Trophy,
  TrendingUp,
} from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Company } from '../types'
import { getOverview } from '../data/mockOverview'
import { getOwnershipTrends } from '../data/mockHolders'
import { getInsiderDeals } from '../data/mockInsiders'
import { getGovernance } from '../data/mockGovernance'
import {
  computeVerdict,
  type DimensionTone,
  type InvestmentVerdict,
  type VerdictCall,
} from '../lib/verdict'

interface Props {
  a: Company
  b: Company
  onBack: () => void
  onSwap: () => void
  onSelectSingle: (c: Company) => void
}

const CALL_CHROME: Record<
  VerdictCall,
  { gradient: string; text: string; chip: string; ring: string }
> = {
  'Strong Buy': {
    gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    text: 'text-emerald-700',
    chip: 'bg-emerald-500',
    ring: 'ring-emerald-200',
  },
  Buy: {
    gradient: 'from-emerald-500 to-teal-600',
    text: 'text-emerald-700',
    chip: 'bg-emerald-500',
    ring: 'ring-emerald-200',
  },
  Hold: {
    gradient: 'from-sky-500 to-indigo-600',
    text: 'text-sky-700',
    chip: 'bg-sky-500',
    ring: 'ring-sky-200',
  },
  Trim: {
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-700',
    chip: 'bg-amber-500',
    ring: 'ring-amber-200',
  },
  Avoid: {
    gradient: 'from-rose-500 to-pink-600',
    text: 'text-rose-700',
    chip: 'bg-rose-500',
    ring: 'ring-rose-200',
  },
}

const TONE_BAR: Record<DimensionTone, string> = {
  positive: 'bg-emerald-500',
  neutral: 'bg-sky-500',
  watch: 'bg-amber-500',
  risky: 'bg-rose-500',
}

const TONE_TEXT: Record<DimensionTone, string> = {
  positive: 'text-emerald-700',
  neutral: 'text-sky-700',
  watch: 'text-amber-700',
  risky: 'text-rose-700',
}

export default function CompareView({ a, b, onBack, onSwap, onSelectSingle }: Props) {
  const aData = useMemo(
    () => ({
      overview: getOverview(a.ticker),
      trends: getOwnershipTrends(a.ticker),
      insider: getInsiderDeals(a.ticker),
      governance: getGovernance(a.ticker),
    }),
    [a.ticker],
  )
  const bData = useMemo(
    () => ({
      overview: getOverview(b.ticker),
      trends: getOwnershipTrends(b.ticker),
      insider: getInsiderDeals(b.ticker),
      governance: getGovernance(b.ticker),
    }),
    [b.ticker],
  )
  const aV = computeVerdict(aData.overview, aData.trends, aData.insider, aData.governance)
  const bV = computeVerdict(bData.overview, bData.trends, bData.insider, bData.governance)

  const winner = aV.totalScore === bV.totalScore ? null : aV.totalScore > bV.totalScore ? 'A' : 'B'

  // ownership trend chart data — last 12 quarters of DII for both
  const trendChart = useMemo(() => {
    const aQ = aData.overview.ownership20q.slice(-12)
    const bQ = bData.overview.ownership20q.slice(-12)
    return aQ.map((q, i) => ({
      quarter: q.quarter,
      [a.ticker]: q.dii,
      [b.ticker]: bQ[i]?.dii ?? null,
    }))
  }, [aData, bData, a.ticker, b.ticker])

  return (
    <div className="min-h-screen bg-ink-50/50">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              aria-label="Back to selector"
              title="Back to company selector"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5 border-l border-ink-100 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
                <ArrowLeftRight className="h-4 w-4 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                  HoldingDash
                </div>
                <div className="text-xs text-ink-400">Compare mode</div>
              </div>
            </div>
            <div className="ml-2 hidden h-9 border-l border-ink-100 md:block" />
            <div className="hidden md:flex md:items-baseline md:gap-2.5">
              <span className="text-base font-semibold text-ink-900">{a.name}</span>
              <span className="text-ink-400">vs</span>
              <span className="text-base font-semibold text-ink-900">{b.name}</span>
            </div>
          </div>
          <button onClick={onSwap} className="btn-ghost" title="Swap A and B">
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Swap
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* HERO — verdict cards side by side */}
        <section className="grid gap-4 md:grid-cols-2 animate-fadeUp">
          <VerdictCard
            company={a}
            verdict={aV}
            isWinner={winner === 'A'}
            onClick={() => onSelectSingle(a)}
          />
          <VerdictCard
            company={b}
            verdict={bV}
            isWinner={winner === 'B'}
            onClick={() => onSelectSingle(b)}
          />
        </section>

        {/* Dimension comparison rows */}
        <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Dimension comparison
              </div>
              <h3 className="text-lg font-semibold text-ink-900">
                Where each name pulls ahead
              </h3>
            </div>
          </div>

          <div className="grid gap-3">
            {aV.dimensions.map((aDim, i) => {
              const bDim = bV.dimensions[i]
              const aWins = aDim.score > bDim.score
              const bWins = bDim.score > aDim.score
              return (
                <div
                  key={aDim.key}
                  className="grid items-stretch gap-2 rounded-2xl border border-ink-100 bg-ink-50/40 p-3 md:grid-cols-[1fr_minmax(120px,160px)_1fr]"
                >
                  <DimensionRowCell
                    side="A"
                    name={a.name}
                    score={aDim.score}
                    signal={aDim.signal}
                    tone={aDim.tone}
                    wins={aWins}
                  />
                  <div className="flex flex-col items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
                    {aDim.label}
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
                      <span className="text-ink-400">vs</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-300" />
                    </div>
                  </div>
                  <DimensionRowCell
                    side="B"
                    name={b.name}
                    score={bDim.score}
                    signal={bDim.signal}
                    tone={bDim.tone}
                    wins={bWins}
                  />
                </div>
              )
            })}
          </div>
        </section>

        {/* DII trend overlay chart */}
        <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                DII share · last 12 quarters
              </div>
              <h3 className="text-lg font-semibold text-ink-900">
                Whose domestic ownership is accumulating faster?
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <SeriesChip color="#10b981" label={a.name} />
              <SeriesChip color="#6366f1" label={b.name} />
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendChart} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="#eef0f6" />
                <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v).toFixed(2)}%`} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line type="monotone" dataKey={a.ticker} name={a.name} stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey={b.ticker} name={b.name} stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Snapshots: insider + governance */}
        <section className="grid gap-4 md:grid-cols-2 animate-fadeUp">
          <SnapshotCard
            title="Insider & Deals"
            icon={<TrendingUp className="h-4 w-4" />}
            gradient="from-amber-500 to-orange-600"
            rows={[
              { label: a.name, value: aData.insider.summary.signal, sub: aData.insider.summary.oneLiner, tone: insiderTone(aData.insider.summary.signal) },
              { label: b.name, value: bData.insider.summary.signal, sub: bData.insider.summary.oneLiner, tone: insiderTone(bData.insider.summary.signal) },
            ]}
          />
          <SnapshotCard
            title="Governance Risk"
            icon={<ShieldAlert className="h-4 w-4" />}
            gradient="from-rose-500 to-pink-600"
            rows={[
              { label: a.name, value: aData.governance.summary.signal, sub: aData.governance.summary.oneLiner, tone: governanceTone(aData.governance.summary.signal) },
              { label: b.name, value: bData.governance.summary.signal, sub: bData.governance.summary.oneLiner, tone: governanceTone(bData.governance.summary.signal) },
            ]}
          />
        </section>

        {/* Final compare read */}
        <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6 md:p-8 shadow-card animate-fadeUp">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.18), transparent)' }}
          />
          <div className="relative flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-glow">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                Compare read
              </div>
              <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-800">
                {compareRead(a, aV, b, bV)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill border border-indigo-200 bg-white text-indigo-700">
                  <Gauge className="h-3 w-3" />
                  {a.ticker.replace('.NS', '')} · {aV.totalScore}/12 · {aV.call}
                </span>
                <span className="pill border border-indigo-200 bg-white text-indigo-700">
                  <Gauge className="h-3 w-3" />
                  {b.ticker.replace('.NS', '')} · {bV.totalScore}/12 · {bV.call}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

/* ===== sub-components ===== */

function VerdictCard({
  company,
  verdict,
  isWinner,
  onClick,
}: {
  company: Company
  verdict: InvestmentVerdict
  isWinner: boolean
  onClick: () => void
}) {
  const chrome = CALL_CHROME[verdict.call]
  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-white p-6 shadow-card ring-1 ${isWinner ? `${chrome.ring} ring-2` : 'ring-transparent'} border-ink-100`}>
      <div className={`absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r ${chrome.gradient}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`pill border ${chrome.text} ${chrome.ring} bg-white`}>
              <Sparkles className="h-3 w-3" />
              {verdict.call}
            </span>
            {isWinner && (
              <span className="pill border border-amber-300 bg-amber-50 text-amber-700">
                <Trophy className="h-3 w-3" />
                Higher composite
              </span>
            )}
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-ink-900">{company.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-700">
              {company.ticker}
            </span>
            <span className="text-[11px] text-ink-400">{company.exchange} · {company.country}</span>
          </div>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-700">{verdict.oneLiner}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Score</div>
          <div className={`text-3xl font-bold ${chrome.text}`}>{verdict.totalScore}</div>
          <div className="text-[10px] text-ink-400">/ 12</div>
        </div>
      </div>
      <button
        onClick={onClick}
        className="mt-4 flex w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink-800 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
      >
        <span>Open full dashboard for {company.name}</span>
        <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-ink-500" />
      </button>
    </div>
  )
}

function DimensionRowCell({
  side,
  name,
  score,
  signal,
  tone,
  wins,
}: {
  side: 'A' | 'B'
  name: string
  score: number
  signal: string
  tone: DimensionTone
  wins: boolean
}) {
  const widthPct = (score / 3) * 100
  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border bg-white p-3 ${
        wins ? 'border-emerald-300 shadow-soft' : 'border-ink-100'
      } ${side === 'B' ? 'md:flex-row-reverse md:text-right' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-[10.5px] font-semibold ${TONE_TEXT[tone]}`}>{signal}</div>
        <div className="truncate text-[12.5px] font-semibold text-ink-900">{name}</div>
        <div className={`mt-1.5 flex items-center gap-2 ${side === 'B' ? 'md:flex-row-reverse' : ''}`}>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div className={`h-full rounded-full ${TONE_BAR[tone]}`} style={{ width: `${widthPct}%` }} />
          </div>
          <span className="text-[10.5px] font-semibold tabular-nums text-ink-600">{score}/3</span>
        </div>
      </div>
      {wins && (
        <span className="pill border border-emerald-300 bg-emerald-50 text-emerald-700 shrink-0">
          <Trophy className="h-3 w-3" />
          Wins
        </span>
      )}
    </div>
  )
}

function SnapshotCard({
  title,
  icon,
  gradient,
  rows,
}: {
  title: string
  icon: React.ReactNode
  gradient: string
  rows: { label: string; value: string; sub: string; tone: DimensionTone }[]
}) {
  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 shadow-card">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${gradient}`} />
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-soft`}>
          {icon}
        </span>
        <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
      </div>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-ink-100 bg-ink-50/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12.5px] font-semibold text-ink-900">{r.label}</span>
              <span className={`pill border ${TONE_TEXT[r.tone]} bg-white`}>
                <span className={`h-1.5 w-1.5 rounded-full ${TONE_BAR[r.tone]}`} />
                {r.value}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-700">{r.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeriesChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink-700">
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function compareRead(a: Company, aV: InvestmentVerdict, b: Company, bV: InvestmentVerdict): string {
  const winner = aV.totalScore === bV.totalScore ? null : aV.totalScore > bV.totalScore ? a : b
  const loser = winner === a ? b : winner === b ? a : null
  const winnerV = winner === a ? aV : winner === b ? bV : null
  if (!winner || !loser || !winnerV) {
    return `${a.name} and ${b.name} score the same on the composite. Decide on the basis of the dimension where each pulls ahead.`
  }
  const wDims = winnerV.dimensions.filter((d) => {
    const otherV = winner === a ? bV : aV
    const other = otherV.dimensions.find((x) => x.key === d.key)
    return other ? d.score > other.score : false
  })
  const wDimList = wDims.map((d) => d.label).join(', ')
  return `${winner.name} scores higher on the composite (${winnerV.totalScore}/12 vs ${winner === a ? bV.totalScore : aV.totalScore}/12) and pulls ahead on ${wDimList || 'multiple dimensions'}. ${loser.name} is the relative laggard on ownership signal — useful as a comparison anchor, not necessarily an avoid.`
}

function insiderTone(signal: string): DimensionTone {
  switch (signal) {
    case 'Positive':
      return 'positive'
    case 'Neutral':
      return 'neutral'
    case 'Watch':
      return 'watch'
    default:
      return 'risky'
  }
}

function governanceTone(signal: string): DimensionTone {
  switch (signal) {
    case 'Low Risk':
      return 'positive'
    case 'Watch':
      return 'watch'
    case 'High Risk':
      return 'risky'
    default:
      return 'risky'
  }
}

const tooltipStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #eef0f6',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(20,26,42,0.18)',
}

