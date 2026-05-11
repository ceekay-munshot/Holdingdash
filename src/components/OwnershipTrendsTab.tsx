import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  LineChart as LineChartIcon,
  Minus,
  Quote,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CompanyOverview, HeatmapCell, HeatmapRow, OwnershipTrendsData } from '../types'
import HolderMovementHeatmap from './HolderMovementHeatmap'
import HolderMovementTable from './HolderMovementTable'
import DataBadge from './DataBadge'

interface Props {
  overview: CompanyOverview
  trends: OwnershipTrendsData
  shareholdingLive?: boolean
  shareholdingSource?: string
}

const STATUS_CHROME = {
  Improving: {
    bg: 'bg-hero-positive',
    border: 'border-emerald-200',
    chip: 'bg-emerald-500',
    text: 'text-emerald-700',
    aurora:
      'radial-gradient(at 8% 0%, rgba(16,185,129,0.20), transparent 55%), radial-gradient(at 92% 0%, rgba(20,184,166,0.18), transparent 55%)',
    icon: TrendingUp,
  },
  Stable: {
    bg: 'bg-hero-positive',
    border: 'border-sky-200',
    chip: 'bg-sky-500',
    text: 'text-sky-700',
    aurora:
      'radial-gradient(at 8% 0%, rgba(14,165,233,0.18), transparent 55%), radial-gradient(at 92% 0%, rgba(99,102,241,0.16), transparent 55%)',
    icon: Minus,
  },
  Weakening: {
    bg: 'bg-hero-watch',
    border: 'border-amber-200',
    chip: 'bg-amber-500',
    text: 'text-amber-700',
    aurora:
      'radial-gradient(at 8% 0%, rgba(245,158,11,0.20), transparent 55%), radial-gradient(at 92% 0%, rgba(244,63,94,0.16), transparent 55%)',
    icon: TrendingDown,
  },
  Risky: {
    bg: 'bg-hero-risky',
    border: 'border-orange-200',
    chip: 'bg-orange-500',
    text: 'text-orange-700',
    aurora:
      'radial-gradient(at 8% 0%, rgba(249,115,22,0.22), transparent 55%), radial-gradient(at 92% 0%, rgba(244,63,94,0.18), transparent 55%)',
    icon: TrendingDown,
  },
} as const

export default function OwnershipTrendsTab({ overview, trends, shareholdingLive, shareholdingSource }: Props) {
  const { story, heatmap, holders, breadth } = trends
  const { ownership20q } = overview
  const chrome = STATUS_CHROME[story.status]
  const StatusIcon = chrome.icon

  // accumulators / reducers — derived from holders
  const sortedHolders = [...holders].sort((a, b) => b.changePct - a.changePct)
  const accumulators = sortedHolders.filter((h) => h.changePct > 0).slice(0, 5)
  const reducers = sortedHolders.filter((h) => h.changePct < 0).slice(-5).reverse()

  const last4Quarters = ownership20q.slice(-4).map((q) => q.quarter)

  // When shareholding is live, compute the heatmap from the live ownership
  // series (Promoter/FII/DII/Public QoQ deltas) instead of mock.
  const liveHeatmap = useMemo(() => {
    if (!shareholdingLive) return null
    const series = ownership20q.slice(-9) // 9 points → 8 deltas
    if (series.length < 2) return null
    const buckets: Array<{ key: 'promoter' | 'fii' | 'dii' | 'public'; label: HeatmapRow['bucket'] }> = [
      { key: 'promoter', label: 'Promoter' },
      { key: 'fii', label: 'FII' },
      { key: 'dii', label: 'DII' },
      { key: 'public', label: 'Public' },
    ]
    const quarters = series.slice(1).map((q) => q.quarter)
    const rows: HeatmapRow[] = buckets.map(({ key, label }) => {
      const cells: HeatmapCell[] = []
      let prevDelta = 0
      for (let i = 1; i < series.length; i++) {
        const delta = +(series[i][key] - series[i - 1][key]).toFixed(2)
        const flipped =
          i > 1 &&
          Math.sign(delta) !== 0 &&
          Math.sign(prevDelta) !== 0 &&
          Math.sign(delta) !== Math.sign(prevDelta) &&
          Math.abs(delta) > 0.12
        let state: HeatmapCell['state']
        if (Math.abs(delta) < 0.06) state = 'stable'
        else if (flipped) state = 'watch'
        else state = delta > 0 ? 'up' : 'down'
        cells.push({ delta, state })
        prevDelta = delta
      }
      return { bucket: label, cells }
    })
    return { quarters, rows }
  }, [shareholdingLive, ownership20q])

  const effectiveHeatmap = liveHeatmap || heatmap

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      {/* === 1. MOVEMENT STORY === */}
      <section
        className={`relative overflow-hidden rounded-3xl border ${chrome.border} ${chrome.bg} p-6 md:p-7 shadow-card animate-fadeUp`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: chrome.aurora }} />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${chrome.chip}`} />
                Ownership movement
              </span>
              <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                <StatusIcon className="h-3 w-3" />
                {story.status}
              </span>
              <DataBadge
                state={shareholdingLive ? 'mixed' : 'mock'}
                hint={
                  shareholdingLive
                    ? `Trend % live from ${shareholdingSource || 'Screener.in'}. Narrative still mock.`
                    : 'Movement story derived from mock holders + heatmap'
                }
              />
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
              <span className={chrome.text}>Ownership is {story.status.toLowerCase()}</span>
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-700">{story.oneLiner}</p>
          </div>

          <div className="grid gap-3">
            <SummaryRow
              tone="positive"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Main positive change"
              text={story.positiveChange}
            />
            <SummaryRow
              tone="negative"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label="Main risk change"
              text={story.riskChange}
            />
          </div>
        </div>
      </section>

      {/* === 2. 20Q TREND CHART === */}
      <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Ownership pattern · 20 quarters
              </div>
              <DataBadge
                state={shareholdingLive ? 'live' : 'mock'}
                hint={
                  shareholdingLive
                    ? `Live shareholding pattern from ${shareholdingSource || 'Screener.in'}`
                    : 'Quarterly ownership pattern is mock — Screener data not yet ingested for this ticker'
                }
              />
            </div>
            <h3 className="text-lg font-semibold text-ink-900">Promoter · FII · DII · Public</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <SeriesChip color="#0ea5e9" label="Promoter" />
            <SeriesChip color="#6366f1" label="FII" />
            <SeriesChip color="#10b981" label="DII" />
            <SeriesChip color="#f59e0b" label="Public" />
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ownership20q} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="last4Highlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef0f6" />
              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 10, fill: '#7c869f' }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#7c869f' }}
                tickLine={false}
                axisLine={false}
                width={32}
                domain={[0, 'dataMax + 4']}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#dde1ec', strokeDasharray: 4 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              {/* highlight last 4 quarters */}
              <ReferenceArea
                x1={last4Quarters[0]}
                x2={last4Quarters[last4Quarters.length - 1]}
                fill="#10b981"
                fillOpacity={0.06}
                stroke="#10b981"
                strokeOpacity={0.18}
                strokeDasharray="3 3"
                label={{
                  value: 'Last 4 quarters',
                  position: 'insideTopLeft',
                  fill: '#059669',
                  fontSize: 10,
                  dy: 4,
                  dx: 6,
                }}
              />
              <Line type="monotone" dataKey="promoter" name="Promoter" stroke="#0ea5e9" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="fii" name="FII" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="dii" name="DII" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="public" name="Public" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 rounded-xl bg-emerald-50/60 px-4 py-3 text-[13px] text-ink-700">
          <span className="font-semibold text-emerald-700">Trend read: </span>
          {story.trendAnnotation}
        </div>
      </section>

      {/* === 3. HEATMAP === */}
      <section className="animate-fadeUp">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          <span>Movement heatmap</span>
          <DataBadge
            state={shareholdingLive ? 'live' : 'mock'}
            hint={
              shareholdingLive
                ? `QoQ deltas computed from live ${shareholdingSource || 'Screener.in'} shareholding`
                : 'Derived from mock ownership trend'
            }
          />
        </div>
        <HolderMovementHeatmap quarters={effectiveHeatmap.quarters} rows={effectiveHeatmap.rows} />
      </section>

      {/* === 4. HOLDER TABLE === */}
      <section className="animate-fadeUp">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          <span>Top holder movement</span>
          <DataBadge state="mock" hint="Holder list and changes are mock — comes free with shareholding data" />
        </div>
        <HolderMovementTable holders={holders} />
      </section>

      {/* === 5. ACCUMULATORS vs REDUCERS === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>Accumulators vs Reducers</span>
        <DataBadge state="mock" />
      </div>
      <section className="grid gap-4 md:grid-cols-2 animate-fadeUp">
        <AccumReduceCard
          tone="positive"
          title="Top Accumulators"
          subtitle="Holders who added the most this quarter"
          icon={<TrendingUp className="h-4 w-4" />}
          rows={accumulators.map((h) => ({ name: h.name, type: h.type, change: h.changePct }))}
          empty="No clear accumulators this quarter."
        />
        <AccumReduceCard
          tone="negative"
          title="Top Reducers"
          subtitle="Holders who trimmed the most this quarter"
          icon={<TrendingDown className="h-4 w-4" />}
          rows={reducers.map((h) => ({ name: h.name, type: h.type, change: h.changePct }))}
          empty="No clear reducers this quarter."
        />
      </section>

      {/* === 6. INSTITUTIONAL BREADTH STRIP === */}
      <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Institutional breadth
              </div>
              <DataBadge state="mock" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900">New entries vs exits</h3>
          </div>
          <BreadthSummary points={breadth} />
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={breadth} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#eef0f6" />
              <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Bar dataKey="newEntries" name="New entries" fill="#34d399" radius={[6, 6, 0, 0]} barSize={18} />
              <Bar dataKey="exits" name="Exits" fill="#fca5a5" radius={[6, 6, 0, 0]} barSize={18} />
              <Line type="monotone" dataKey="net" name="Net breadth" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-ink-50/60 px-4 py-3 text-[13px] text-ink-700">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>{story.breadthRead}</span>
        </div>
      </section>

      {/* === 7. FINAL READ === */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6 md:p-8 shadow-card animate-fadeUp">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.16), transparent)' }}
        />
        <div className="relative flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-glow">
            <Quote className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                Final ownership trends read
              </div>
              <DataBadge
                state={shareholdingLive ? 'mixed' : 'mock'}
                hint={
                  shareholdingLive
                    ? `Numbers live from ${shareholdingSource || 'Screener.in'}, narrative still mock`
                    : undefined
                }
              />
            </div>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-800">{story.finalRead}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`pill border ${chrome.border} bg-white ${chrome.text}`}>
                Trend · {story.status}
              </span>
              <span className="pill border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Users className="h-3 w-3" />
                {holders.length} holders tracked
              </span>
              <span className="pill border border-ink-200 bg-white text-ink-700">
                <LineChartIcon className="h-3 w-3" />
                20 quarters reviewed
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ===== sub-components ===== */

function SummaryRow({
  tone,
  icon,
  label,
  text,
}: {
  tone: 'positive' | 'negative'
  icon: React.ReactNode
  label: string
  text: string
}) {
  const styles =
    tone === 'positive'
      ? { border: 'border-emerald-200', bg: 'bg-emerald-50/70', icon: 'bg-emerald-500', label: 'text-emerald-700' }
      : { border: 'border-rose-200', bg: 'bg-rose-50/70', icon: 'bg-rose-500', label: 'text-rose-700' }
  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${styles.icon} text-white`}>
          {icon}
        </span>
        <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${styles.label}`}>
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-ink-900">{text}</p>
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

function AccumReduceCard({
  tone,
  title,
  subtitle,
  icon,
  rows,
  empty,
}: {
  tone: 'positive' | 'negative'
  title: string
  subtitle: string
  icon: React.ReactNode
  rows: { name: string; type: string; change: number }[]
  empty: string
}) {
  const chrome =
    tone === 'positive'
      ? { strip: 'from-emerald-500 to-teal-600', label: 'text-emerald-700', tint: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : { strip: 'from-rose-500 to-orange-500', label: 'text-rose-700', tint: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 border-rose-200' }

  const maxAbs = Math.max(0.01, ...rows.map((r) => Math.abs(r.change)))

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5">
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${chrome.strip}`} />
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${chrome.strip} text-white shadow-soft`}>
          {icon}
        </span>
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-wider ${chrome.label}`}>{title}</div>
          <div className="text-[11px] text-ink-400">{subtitle}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {rows.length === 0 && (
          <div className="rounded-xl bg-ink-50/60 px-4 py-6 text-center text-sm text-ink-400">
            {empty}
          </div>
        )}
        {rows.map((r) => {
          const w = Math.max(8, (Math.abs(r.change) / maxAbs) * 100)
          return (
            <div key={r.name} className="group">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink-900">{r.name}</div>
                  <div className="text-[10.5px] text-ink-500">{r.type}</div>
                </div>
                <span className={`pill border ${chrome.chip} tabular-nums`}>
                  {tone === 'positive' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {r.change > 0 ? '+' : ''}
                  {r.change.toFixed(2)}pp
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${chrome.tint} transition-all duration-500`}
                  style={{ width: `${w}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BreadthSummary({ points }: { points: { newEntries: number; exits: number; net: number }[] }) {
  const totalNew = points.reduce((a, p) => a + p.newEntries, 0)
  const totalExits = points.reduce((a, p) => a + p.exits, 0)
  const totalNet = totalNew - totalExits
  const lastNet = points[points.length - 1]?.net ?? 0
  const tone = lastNet >= 0 ? 'positive' : 'negative'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Stat label="Total new" value={totalNew} />
      <Stat label="Total exits" value={totalExits} />
      <span
        className={`pill border ${
          tone === 'positive'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}
      >
        {tone === 'positive' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        Net · {totalNet > 0 ? '+' : ''}
        {totalNet}
      </span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink-700">
      <span className="text-ink-400">{label}</span>
      <span className="tabular-nums text-ink-900">{value}</span>
    </span>
  )
}

const tooltipStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #eef0f6',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(20,26,42,0.18)',
}

