import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  LogOut,
  Repeat,
  Sparkles,
  Wifi,
  Zap,
} from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { BulkBlockDeal, DealSignal, DealType } from '../types'

interface Props {
  deals: BulkBlockDeal[]
  read: string
  live?: boolean
}

const SIGNAL_STYLE: Record<
  DealSignal,
  { bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  'Institutional Accumulation': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
  'Large Exit': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <LogOut className="h-3 w-3" />,
  },
  Churn: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: <Repeat className="h-3 w-3" />,
  },
  Unusual: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Zap className="h-3 w-3" />,
  },
  Neutral: {
    bg: 'bg-ink-50',
    text: 'text-ink-600',
    border: 'border-ink-200',
    icon: <Sparkles className="h-3 w-3" />,
  },
}

const DEAL_TYPE_STYLE: Record<DealType, string> = {
  Bulk: 'bg-sky-100 text-sky-700',
  Block: 'bg-violet-100 text-violet-700',
}

type FilterKey = 'All' | 'Block' | 'Bulk' | 'Accumulation' | 'Exit'
const FILTERS: FilterKey[] = ['All', 'Block', 'Bulk', 'Accumulation', 'Exit']

export default function BulkDealsSection({ deals, read, live }: Props) {
  const [filter, setFilter] = useState<FilterKey>('All')

  const filtered = useMemo(() => {
    if (filter === 'All') return deals
    if (filter === 'Block') return deals.filter((d) => d.dealType === 'Block')
    if (filter === 'Bulk') return deals.filter((d) => d.dealType === 'Bulk')
    if (filter === 'Accumulation') return deals.filter((d) => d.signal === 'Institutional Accumulation')
    if (filter === 'Exit') return deals.filter((d) => d.signal === 'Large Exit')
    return deals
  }, [deals, filter])

  const chartData = useMemo(() => {
    // sort ascending date for timeline
    return [...deals]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((d) => ({
        date: d.date,
        label: d.date.slice(5), // MM-DD
        netValue: d.signal === 'Large Exit' ? -d.value : d.value,
        signal: d.signal,
      }))
  }, [deals])

  const totals = useMemo(() => {
    let accum = 0
    let exit = 0
    for (const d of deals) {
      if (d.signal === 'Institutional Accumulation') accum += d.value
      if (d.signal === 'Large Exit') exit += d.value
    }
    return { accum: +accum.toFixed(1), exit: +exit.toFixed(1) }
  }, [deals])

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Bulk & block deals · {live ? 'last 7 trading days' : 'last 6 months'}
            </div>
            {live && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            Who is accumulating, who is exiting?
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
            <ArrowUpRight className="h-3 w-3" />
            Accumulation ₹{totals.accum} Cr
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
            <ArrowDownRight className="h-3 w-3" />
            Exit ₹{totals.exit} Cr
          </span>
        </div>
      </div>

      {/* timeline chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#eef0f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: '#7c869f' }}
              tickLine={false}
              axisLine={false}
              width={36}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [`₹${Math.abs(Number(value)).toFixed(1)} Cr`, 'Deal value']}
              labelFormatter={(label) => String(label)}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <Bar dataKey="netValue" name="Deal value (signed)" radius={[4, 4, 4, 4]} barSize={28}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.signal === 'Institutional Accumulation'
                      ? '#10b981'
                      : d.signal === 'Large Exit'
                      ? '#ef4444'
                      : d.signal === 'Churn'
                      ? '#6366f1'
                      : d.signal === 'Unusual'
                      ? '#f59e0b'
                      : '#94a3b8'
                  }
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* filter pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-ink-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-ink-50/60 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Vs market</th>
                <th className="px-4 py-3">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-ink-400">
                    No deals match.
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => {
                const sig = SIGNAL_STYLE[d.signal]
                const premiumPositive = d.premiumPct > 0
                return (
                  <tr key={i} className="group transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-3 tabular-nums text-ink-700">{d.date}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">{d.buyer}</td>
                    <td className="px-4 py-3 text-ink-700">{d.seller}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${DEAL_TYPE_STYLE[d.dealType]}`}
                      >
                        <Layers className="h-3 w-3" />
                        {d.dealType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                      ₹{d.value.toFixed(1)} Cr
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold tabular-nums ${
                          premiumPositive
                            ? 'bg-emerald-50 text-emerald-700'
                            : d.premiumPct < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-ink-50 text-ink-600'
                        }`}
                      >
                        {premiumPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {premiumPositive && '+'}
                        {d.premiumPct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${sig.bg} ${sig.text} ${sig.border}`}
                      >
                        {sig.icon}
                        {d.signal}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-ink-50/60 px-4 py-3 text-[13px] text-ink-700">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span>{read}</span>
      </div>
    </section>
  )
}

const tooltipStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #eef0f6',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(20,26,42,0.18)',
}
