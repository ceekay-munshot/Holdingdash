import { useEffect } from 'react'
import { X, ArrowRight, Sparkles } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  CompanyOverview,
  InsightDrawerData,
  TabKey,
} from '../types'

interface Props {
  open: boolean
  data: InsightDrawerData | null
  overview: CompanyOverview
  onClose: () => void
  onJumpTab: (tab: TabKey) => void
}

const toneStyles: Record<
  InsightDrawerData['signalTone'],
  { ring: string; pill: string; chip: string; bar: string }
> = {
  positive: {
    ring: 'ring-emerald-200',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    chip: 'bg-emerald-500',
    bar: '#10b981',
  },
  watch: {
    ring: 'ring-amber-200',
    pill: 'bg-amber-50 text-amber-700 border-amber-200',
    chip: 'bg-amber-500',
    bar: '#f59e0b',
  },
  risky: {
    ring: 'ring-orange-200',
    pill: 'bg-orange-50 text-orange-700 border-orange-200',
    chip: 'bg-orange-500',
    bar: '#f97316',
  },
  red: {
    ring: 'ring-rose-200',
    pill: 'bg-rose-50 text-rose-700 border-rose-200',
    chip: 'bg-rose-500',
    bar: '#ef4444',
  },
}

export default function InsightDrawer({ open, data, overview, onClose, onJumpTab }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !data) return null
  const tone = toneStyles[data.signalTone]

  return (
    <div className="fixed inset-0 z-40">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* panel */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] animate-slideIn flex-col bg-white shadow-[-32px_0_60px_-20px_rgba(20,26,42,0.18)]">
        {/* header */}
        <div className={`relative overflow-hidden border-b border-ink-100 px-6 py-5`}>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-90"
            style={{
              background:
                data.signalTone === 'positive'
                  ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 60%, #eff6ff 100%)'
                  : data.signalTone === 'watch'
                  ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #ecfeff 100%)'
                  : data.signalTone === 'risky'
                  ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fef2f2 100%)'
                  : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 60%, #fff1f2 100%)',
            }}
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className={`pill border ${tone.pill}`}
              >
                <Sparkles className="h-3 w-3" />
                Insight detail
              </span>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-ink-900">
                {data.title}
              </h3>
              <p className="mt-1 text-sm text-ink-600">{data.oneLiner}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 text-ink-500 transition-colors hover:bg-white hover:text-ink-800"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="drawer-scroll flex-1 overflow-y-auto px-6 py-5">
          {/* chart */}
          <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                {data.chartType === 'ownership' && 'Ownership trend (last 12 quarters)'}
                {data.chartType === 'holderBars' && 'Top movers (this quarter)'}
                {data.chartType === 'insiderFlow' && 'Insider buy / sell flow'}
                {data.chartType === 'rptArea' && 'RPT vs revenue trend'}
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                {data.chartType === 'ownership' ? (
                  <AreaChart data={overview.ownership20q.slice(-12)}>
                    <defs>
                      <linearGradient id="diiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fiiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#eef0f6" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="dii" stroke="#10b981" strokeWidth={2} fill="url(#diiGrad)" name="DII" />
                    <Area type="monotone" dataKey="fii" stroke="#6366f1" strokeWidth={2} fill="url(#fiiGrad)" name="FII" />
                  </AreaChart>
                ) : data.chartType === 'holderBars' ? (
                  <BarChart
                    data={[
                      { name: overview.holderMovement.topAccumulator.name, value: +overview.holderMovement.topAccumulator.changePct.toFixed(2) },
                      { name: 'New entries', value: overview.holderMovement.newEntries / 100 },
                      { name: 'Exits', value: -overview.holderMovement.exits / 100 },
                      { name: overview.holderMovement.topReducer.name, value: +overview.holderMovement.topReducer.changePct.toFixed(2) },
                    ]}
                    layout="vertical"
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid horizontal={false} stroke="#eef0f6" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#525c75' }} tickLine={false} axisLine={false} width={130} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                      {[
                        overview.holderMovement.topAccumulator.changePct,
                        overview.holderMovement.newEntries,
                        -overview.holderMovement.exits,
                        overview.holderMovement.topReducer.changePct,
                      ].map((v, i) => (
                        <Cell key={i} fill={v >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : data.chartType === 'insiderFlow' ? (
                  <BarChart data={overview.insiderDeals.monthlyFlow}>
                    <CartesianGrid vertical={false} stroke="#eef0f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    <Bar dataKey="buy" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} name="Buy (Cr)" />
                    <Bar dataKey="sell" stackId="a" fill="#f59e0b" radius={[0, 0, 6, 6]} name="Sell (Cr)" />
                  </BarChart>
                ) : (
                  <AreaChart data={overview.governance.rptTrend}>
                    <defs>
                      <linearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#eef0f6" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="rpt" stroke="#f43f5e" strokeWidth={2} fill="url(#rptGrad)" name="RPT %" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* buy-side note */}
          <div className={`mt-5 rounded-2xl border bg-white p-5 ring-1 ${tone.ring} border-ink-100 shadow-soft`}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${tone.chip}`} />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Buy-side read
              </span>
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-700">{data.buySideNote}</p>
          </div>

          {/* CTA */}
          <button
            onClick={() => onJumpTab(data.tab)}
            className="mt-5 flex w-full items-center justify-between rounded-2xl border border-ink-200 bg-white px-5 py-3.5 text-sm font-semibold text-ink-800 shadow-soft transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-glow"
          >
            <span>View full {data.tab === 'overview' ? 'Overview' : data.tab === 'trends' ? 'Ownership Trends' : data.tab === 'insider' ? 'Insider & Deals' : 'Governance Risk'} tab</span>
            <ArrowRight className="h-4 w-4 text-emerald-600" />
          </button>
        </div>
      </aside>
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
