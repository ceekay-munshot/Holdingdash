import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RPTTrendPoint } from '../types'

interface Props {
  trend: RPTTrendPoint[]
  annotation: string
}

export default function RPTTrendChart({ trend, annotation }: Props) {
  const last = trend[trend.length - 1]
  const peakRpt = Math.max(...trend.map((t) => t.rpt))

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            RPT vs revenue · {trend[0].period}–{last.period}
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            Is value leaking, or is it growing in step with revenue?
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 font-semibold text-ink-700">
            <span className="h-2 w-2 rounded-sm bg-ink-300" />
            Revenue (₹ Cr)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
            <span className="h-2 w-2 rounded-sm bg-rose-500" />
            RPT (₹ Cr)
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            RPT % of revenue
          </span>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend} margin={{ top: 8, right: 36, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#eef0f6" />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#7c869f' }} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#7c869f' }}
              tickLine={false}
              axisLine={false}
              width={50}
              tickFormatter={(v: number) => formatCr(v)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#10b981' }}
              tickLine={false}
              axisLine={false}
              width={42}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const v = Number(value)
                const n = String(name)
                if (n === 'RPT % of revenue') return [`${v.toFixed(2)}%`, n]
                return [`₹${formatCr(v)} Cr`, n]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <ReferenceLine yAxisId="right" y={5} stroke="#fbbf24" strokeDasharray="3 3" />
            <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={36} />
            <Bar yAxisId="left" dataKey="rpt" name="RPT" radius={[4, 4, 0, 0]} barSize={18}>
              {trend.map((t, i) => (
                <Cell key={i} fill={t.outpacing ? '#ef4444' : '#fb7185'} stroke={t.outpacing ? '#9f1239' : 'none'} strokeWidth={t.outpacing ? 1.5 : 0} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rptPctRevenue"
              name="RPT % of revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
          <span className="h-2 w-2 rounded-sm bg-rose-500 ring-2 ring-rose-300" />
          Period where RPT growth outpaced revenue
        </span>
        <span className="text-ink-500">
          Latest RPT: <span className="font-semibold tabular-nums text-ink-900">₹{formatCr(last.rpt)} Cr</span> ·
          peak: <span className="font-semibold tabular-nums text-ink-900">₹{formatCr(peakRpt)} Cr</span>
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-ink-50/60 px-4 py-3 text-[13px] text-ink-700">
        <span className="font-semibold text-ink-900">Read: </span>
        {annotation}
      </div>
    </section>
  )
}

function formatCr(v: number): string {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return `${v.toFixed(0)}`
}

const tooltipStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid #eef0f6',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 24px -12px rgba(20,26,42,0.18)',
}
