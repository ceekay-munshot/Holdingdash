import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  ShieldAlert,
  ArrowLeftRight,
  LineChart as LineChartIcon,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Quote,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import type {
  CompanyOverview,
  InsightDrawerData,
  SignalLevel,
  TabKey,
} from '../types'
import InsightDrawer from './InsightDrawer'

interface Props {
  overview: CompanyOverview
  onJumpTab: (tab: TabKey) => void
}

const signalChrome: Record<
  SignalLevel,
  { bg: string; chip: string; text: string; ring: string; border: string; aurora: string }
> = {
  Positive: {
    bg: 'bg-hero-positive',
    chip: 'bg-emerald-500',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    border: 'border-emerald-200',
    aurora:
      'radial-gradient(at 12% 8%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(at 90% 10%, rgba(20,184,166,0.18), transparent 55%)',
  },
  Watch: {
    bg: 'bg-hero-watch',
    chip: 'bg-amber-500',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    border: 'border-amber-200',
    aurora:
      'radial-gradient(at 12% 8%, rgba(245,158,11,0.22), transparent 55%), radial-gradient(at 88% 10%, rgba(99,102,241,0.16), transparent 55%)',
  },
  Risky: {
    bg: 'bg-hero-risky',
    chip: 'bg-orange-500',
    text: 'text-orange-700',
    ring: 'ring-orange-200',
    border: 'border-orange-200',
    aurora:
      'radial-gradient(at 12% 8%, rgba(249,115,22,0.22), transparent 55%), radial-gradient(at 88% 10%, rgba(244,63,94,0.18), transparent 55%)',
  },
  'Red Flag': {
    bg: 'bg-hero-risky',
    chip: 'bg-rose-600',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    border: 'border-rose-200',
    aurora:
      'radial-gradient(at 12% 8%, rgba(239,68,68,0.26), transparent 55%), radial-gradient(at 88% 10%, rgba(244,63,94,0.20), transparent 55%)',
  },
}

const trendIcon = {
  Improving: TrendingUp,
  Stable: Minus,
  Weakening: TrendingDown,
}

export default function OverviewTab({ overview, onJumpTab }: Props) {
  const { signal, ownership20q, holderMovement, insiderDeals, governance } = overview
  const chrome = signalChrome[signal.signal]
  const TIcon = trendIcon[signal.trend]

  const [drawer, setDrawer] = useState<InsightDrawerData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function openTile(d: InsightDrawerData) {
    setDrawer(d)
    setDrawerOpen(true)
  }

  // tile mini data
  const lastQ = ownership20q[ownership20q.length - 1]
  const prevQ = ownership20q[ownership20q.length - 2]
  const changes = useMemo(
    () => ({
      promoter: +(lastQ.promoter - prevQ.promoter).toFixed(2),
      fii: +(lastQ.fii - prevQ.fii).toFixed(2),
      dii: +(lastQ.dii - prevQ.dii).toFixed(2),
      public: +(lastQ.public - prevQ.public).toFixed(2),
    }),
    [lastQ, prevQ],
  )

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* === 1. HERO === */}
        <section
          className={`relative overflow-hidden rounded-3xl border ${chrome.border} ${chrome.bg} p-6 md:p-7 shadow-card animate-fadeUp`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: chrome.aurora }}
          />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr]">
            {/* left */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${chrome.chip}`} />
                  Ownership Signal
                </span>
                <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                  <TIcon className="h-3 w-3" />
                  {signal.trend}
                </span>
                <span className="pill border border-ink-200 bg-white/80 text-ink-700">
                  <Eye className="h-3 w-3" />
                  Last quarter: {lastQ.quarter}
                </span>
              </div>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
                <span className={chrome.text}>{signal.signal}</span>{' '}
                <span className="text-ink-700">·</span>{' '}
                <span className="text-ink-700">{signal.trend}</span>
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-700">
                {signal.oneLiner}
              </p>

              {/* mini stats */}
              <div className="mt-4 flex flex-wrap gap-2">
                <MiniStat label="Promoter" value={`${lastQ.promoter.toFixed(1)}%`} delta={changes.promoter} />
                <MiniStat label="FII" value={`${lastQ.fii.toFixed(1)}%`} delta={changes.fii} />
                <MiniStat label="DII" value={`${lastQ.dii.toFixed(1)}%`} delta={changes.dii} />
                <MiniStat label="Public" value={`${lastQ.public.toFixed(1)}%`} delta={changes.public} />
              </div>
            </div>

            {/* right - sparkline panel */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  DII momentum · last 10 quarters
                </div>
                <span className={`pill ${chrome.text} ${chrome.border} border bg-white`}>
                  <Sparkles className="h-3 w-3" />
                  Signal pulse
                </span>
              </div>
              <div className="mt-2 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signal.sparkline.map((v, i) => ({ i, v }))}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#sparkGrad)"
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-500">
                <span>{ownership20q[ownership20q.length - 10]?.quarter ?? ''}</span>
                <span>{lastQ.quarter}</span>
              </div>
            </div>
          </div>
        </section>

        {/* === 2. CLICKABLE INSIGHT TILES === */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InsightTile
            tone="positive"
            icon={LineChartIcon}
            label="Ownership Trend"
            read={signal.ownershipTrendRead}
            onClick={() =>
              openTile({
                title: 'Ownership trend',
                tab: 'trends',
                signalTone: signal.signal === 'Positive' ? 'positive' : signal.signal === 'Watch' ? 'watch' : signal.signal === 'Risky' ? 'risky' : 'red',
                oneLiner: signal.ownershipTrendRead,
                buySideNote:
                  'DII vs FII positioning is the most reliable buy-side signal we look at first. Watch the slope and persistence — five-plus quarters of one-sided accumulation rarely reverses without cause.',
                chartType: 'ownership',
              })
            }
          >
            <MiniMultiSpark series={ownership20q.slice(-10)} />
          </InsightTile>

          <InsightTile
            tone={holderMovement.breadthChange >= 0 ? 'positive' : 'watch'}
            icon={Users}
            label="Holder Movement"
            read={signal.holderMovementRead}
            onClick={() =>
              openTile({
                title: 'Holder movement',
                tab: 'trends',
                signalTone: holderMovement.breadthChange >= 0 ? 'positive' : 'watch',
                oneLiner: signal.holderMovementRead,
                buySideNote:
                  'Top accumulator and top reducer set the institutional narrative. Pair their move with breadth (count of institutions) to separate idiosyncratic flows from broad rotation.',
                chartType: 'holderBars',
              })
            }
          >
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <ChipKV
                tone="up"
                label="Top accumulator"
                primary={holderMovement.topAccumulator.name}
                secondary={`+${holderMovement.topAccumulator.changePct.toFixed(2)}pp`}
              />
              <ChipKV
                tone="down"
                label="Top reducer"
                primary={holderMovement.topReducer.name}
                secondary={`${holderMovement.topReducer.changePct.toFixed(2)}pp`}
              />
              <ChipKV tone="neutral" label="New entries" primary={`${holderMovement.newEntries}`} />
              <ChipKV tone="neutral" label="Exits" primary={`${holderMovement.exits}`} />
            </div>
          </InsightTile>

          <InsightTile
            tone={insiderDeals.insiderSignal === 'Routine' ? 'positive' : 'watch'}
            icon={ArrowLeftRight}
            label="Insider & Deals"
            read={signal.insiderDealsRead}
            onClick={() =>
              openTile({
                title: 'Insider & deals',
                tab: 'insider',
                signalTone: insiderDeals.insiderSignal === 'Routine' ? 'positive' : 'watch',
                oneLiner: signal.insiderDealsRead,
                buySideNote:
                  'Cluster sells by promoter group is the single most informative governance signal for buy-side. Routine ESOP-driven sells are noise; coordinated, time-clustered sells are not.',
                chartType: 'insiderFlow',
              })
            }
          >
            <div className="mt-3 flex gap-2">
              <SignalChip
                kind={insiderDeals.insiderSignal === 'Routine' ? 'good' : 'warn'}
                label={`Insider · ${insiderDeals.insiderSignal}`}
              />
              <SignalChip
                kind={insiderDeals.bulkDealNet >= 0 ? 'good' : 'warn'}
                label={`Bulk net · ${insiderDeals.bulkDealNet >= 0 ? '+' : ''}${insiderDeals.bulkDealNet} Cr`}
              />
            </div>
            <div className="mt-3 flex items-end gap-1">
              {insiderDeals.monthlyFlow.map((m, i) => {
                const max =
                  Math.max(
                    ...insiderDeals.monthlyFlow.flatMap((x) => [x.buy, x.sell]),
                  ) || 1
                return (
                  <div key={i} className="flex flex-1 flex-col items-stretch gap-0.5">
                    <div
                      className="rounded-sm bg-emerald-400/80"
                      style={{ height: `${Math.max(2, (m.buy / max) * 26)}px` }}
                    />
                    <div
                      className="rounded-sm bg-amber-400/80"
                      style={{ height: `${Math.max(2, (m.sell / max) * 26)}px` }}
                    />
                    <div className="text-center text-[9px] text-ink-400">{m.month}</div>
                  </div>
                )
              })}
            </div>
          </InsightTile>

          <InsightTile
            tone={
              governance.riskLevel === 'Low'
                ? 'positive'
                : governance.riskLevel === 'Medium'
                ? 'watch'
                : 'risky'
            }
            icon={ShieldAlert}
            label="Governance Risk"
            read={signal.governanceRead}
            onClick={() =>
              openTile({
                title: 'Governance risk',
                tab: 'governance',
                signalTone:
                  governance.riskLevel === 'Low'
                    ? 'positive'
                    : governance.riskLevel === 'Medium'
                    ? 'watch'
                    : 'risky',
                oneLiner: signal.governanceRead,
                buySideNote:
                  'RPT-to-revenue, pledge moves, and auditor changes are the three governance numbers that should determine final position sizing. If any one drifts up persistently, downsize before adding alpha.',
                chartType: 'rptArea',
              })
            }
          >
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <ChipKV
                tone={governance.rptYoyChange > 0 ? 'down' : 'up'}
                label="RPT / revenue"
                primary={`${governance.rptToRevenuePct.toFixed(1)}%`}
                secondary={`${governance.rptYoyChange > 0 ? '+' : ''}${governance.rptYoyChange.toFixed(1)}pp YoY`}
              />
              <ChipKV
                tone={governance.riskLevel === 'Low' ? 'up' : 'down'}
                label="Risk level"
                primary={governance.riskLevel}
              />
              <ChipKV tone="neutral" label="Pledge" primary={`${governance.pledgePct.toFixed(1)}%`} />
              <ChipKV tone="neutral" label="Auditor changes" primary={`${governance.auditorChanges}`} />
            </div>
          </InsightTile>
        </section>

        {/* === 3. MAIN OWNERSHIP TREND CHART === */}
        <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Ownership pattern · 20 quarters
              </div>
              <h3 className="text-lg font-semibold text-ink-900">
                Promoter · FII · DII · Public
              </h3>
            </div>
            <button
              onClick={() => onJumpTab('trends')}
              className="btn-ghost"
              title="Jump to Ownership Trends tab"
            >
              View full trends
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ownership20q} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <ReferenceLine
                  x={ownership20q[ownership20q.length - 4]?.quarter}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  label={{ value: 'last 4Q', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }}
                />
                <Line type="monotone" dataKey="promoter" name="Promoter" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="fii" name="FII" stroke="#6366f1" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="dii" name="DII" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="public" name="Public" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 rounded-xl bg-ink-50/60 px-4 py-3 text-[13px] text-ink-700">
            <span className="font-semibold text-ink-900">Read: </span>
            {signal.ownershipTrendRead}. Promoter holding has stayed within a ±1pp band; the visible
            shift is the DII vs FII rotation in the last several quarters.
          </div>
        </section>

        {/* === 4. WHAT CHANGED RECENTLY === */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
              What changed recently
            </h3>
            <span className="text-[11px] text-ink-400">{lastQ.quarter}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ChangeCard
              tone="positive"
              icon={CheckCircle2}
              title="Biggest positive"
              text={signal.recentChanges.positive}
            />
            <ChangeCard
              tone="negative"
              icon={AlertTriangle}
              title="Biggest negative"
              text={signal.recentChanges.negative}
            />
            <ChangeCard
              tone="unusual"
              icon={Sparkles}
              title="Most unusual"
              text={signal.recentChanges.unusual}
            />
          </div>
        </section>

        {/* === 5. FINAL BUY-SIDE READ === */}
        <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6 md:p-8 shadow-card animate-fadeUp">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, rgba(16,185,129,0.16), transparent)',
            }}
          />
          <div className="relative flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow">
              <Quote className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Final buy-side read
              </div>
              <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-800">
                {signal.buySideRead}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="pill border border-emerald-200 bg-emerald-50 text-emerald-700">
                  Signal · {signal.signal}
                </span>
                <span className="pill border border-indigo-200 bg-indigo-50 text-indigo-700">
                  Trend · {signal.trend}
                </span>
                <span className="pill border border-ink-200 bg-white text-ink-700">
                  Updated {lastQ.quarter}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Drawer */}
      <InsightDrawer
        open={drawerOpen}
        data={drawer}
        overview={overview}
        onClose={() => setDrawerOpen(false)}
        onJumpTab={(t) => {
          setDrawerOpen(false)
          onJumpTab(t)
        }}
      />
    </>
  )
}

/* ===== sub components ===== */

function MiniStat({ label, value, delta }: { label: string; value: string; delta: number }) {
  const up = delta > 0
  const down = delta < 0
  return (
    <div className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-base font-semibold text-ink-900 tabular-nums">{value}</span>
        <span
          className={`text-[10px] font-semibold ${
            up ? 'text-emerald-600' : down ? 'text-rose-600' : 'text-ink-400'
          }`}
        >
          {up && '+'}
          {delta.toFixed(2)}pp
        </span>
      </div>
    </div>
  )
}

function InsightTile({
  tone,
  icon: Icon,
  label,
  read,
  children,
  onClick,
}: {
  tone: 'positive' | 'watch' | 'risky' | 'red'
  icon: typeof Users
  label: string
  read: string
  children?: React.ReactNode
  onClick: () => void
}) {
  const toneMap = {
    positive: { ring: 'group-hover:ring-emerald-200', bar: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-500' },
    watch: { ring: 'group-hover:ring-amber-200', bar: 'from-amber-500 to-orange-500', dot: 'bg-amber-500' },
    risky: { ring: 'group-hover:ring-orange-200', bar: 'from-orange-500 to-rose-500', dot: 'bg-orange-500' },
    red: { ring: 'group-hover:ring-rose-200', bar: 'from-rose-500 to-pink-600', dot: 'bg-rose-500' },
  }[tone]
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-soft ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-card ${toneMap.ring}`}
    >
      {/* gradient strip */}
      <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${toneMap.bar}`} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${toneMap.bar} text-white shadow-soft`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            {label}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${toneMap.dot}`} />
        <span className="text-[13.5px] font-semibold leading-snug text-ink-800">{read}</span>
      </div>
      <div className="mt-2 flex-1">{children}</div>
      <div className="mt-3 text-[11px] font-semibold text-ink-400 group-hover:text-emerald-600">
        Click for detail →
      </div>
    </button>
  )
}

function MiniMultiSpark({ series }: { series: { quarter: string; promoter: number; fii: number; dii: number; public: number }[] }) {
  return (
    <div className="mt-3 h-20">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <Line type="monotone" dataKey="promoter" stroke="#0ea5e9" strokeWidth={1.6} dot={false} />
          <Line type="monotone" dataKey="fii" stroke="#6366f1" strokeWidth={1.6} dot={false} />
          <Line type="monotone" dataKey="dii" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="public" stroke="#f59e0b" strokeWidth={1.6} dot={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#dde1ec' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChipKV({
  tone,
  label,
  primary,
  secondary,
}: {
  tone: 'up' | 'down' | 'neutral'
  label: string
  primary: string
  secondary?: string
}) {
  const colors = {
    up: 'border-emerald-200 bg-emerald-50',
    down: 'border-rose-200 bg-rose-50',
    neutral: 'border-ink-200 bg-ink-50/60',
  }[tone]
  const icon =
    tone === 'up' ? (
      <ArrowUpRight className="h-3 w-3 text-emerald-600" />
    ) : tone === 'down' ? (
      <ArrowDownRight className="h-3 w-3 text-rose-600" />
    ) : null
  return (
    <div className={`rounded-xl border px-2.5 py-1.5 ${colors}`}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-0.5 truncate text-[12px] font-semibold text-ink-900">{primary}</div>
      {secondary && (
        <div className="text-[10px] text-ink-500">{secondary}</div>
      )}
    </div>
  )
}

function SignalChip({ kind, label }: { kind: 'good' | 'warn' | 'bad'; label: string }) {
  const map = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-700',
    bad: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  return <span className={`pill border ${map[kind]}`}>{label}</span>
}

function ChangeCard({
  tone,
  icon: Icon,
  title,
  text,
}: {
  tone: 'positive' | 'negative' | 'unusual'
  icon: typeof CheckCircle2
  title: string
  text: string
}) {
  const styles = {
    positive: { border: 'border-emerald-200', bg: 'bg-emerald-50/60', icon: 'bg-emerald-500', label: 'text-emerald-700' },
    negative: { border: 'border-rose-200', bg: 'bg-rose-50/60', icon: 'bg-rose-500', label: 'text-rose-700' },
    unusual: { border: 'border-indigo-200', bg: 'bg-indigo-50/60', icon: 'bg-indigo-500', label: 'text-indigo-700' },
  }[tone]
  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-5 shadow-soft transition-transform hover:-translate-y-0.5`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${styles.icon} text-white`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${styles.label}`}>
          {title}
        </span>
      </div>
      <p className="mt-2 text-[14px] font-medium leading-snug text-ink-800">{text}</p>
    </div>
  )
}

const tooltipStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #eef0f6',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(20,26,42,0.18)',
}
