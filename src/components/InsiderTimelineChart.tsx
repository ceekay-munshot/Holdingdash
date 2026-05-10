import { useMemo } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { InsiderHorizon, InsiderTrade, PricePoint } from '../types'
import { HORIZON_MONTHS, monthLabel } from '../data/mockInsiders'

interface Props {
  horizon: InsiderHorizon
  pricePoints: PricePoint[]
  trades: InsiderTrade[]
  annotation: string
}

interface MonthRow {
  date: string
  label: string
  price: number
  buy: number // buy value in INR Cr in this month
  sell: number // (negative) sell value in INR Cr in this month
}

export default function InsiderTimelineChart({ horizon, pricePoints, trades, annotation }: Props) {
  const months = HORIZON_MONTHS[horizon]
  const sliced = useMemo(() => {
    const start = Math.max(0, pricePoints.length - months)
    return pricePoints.slice(start)
  }, [pricePoints, months])

  const data: MonthRow[] = useMemo(() => {
    // group trades by year-month
    const buyMap = new Map<string, number>()
    const sellMap = new Map<string, number>()
    for (const t of trades) {
      const key = t.date.slice(0, 7) // YYYY-MM
      if (t.type === 'Buy') buyMap.set(key, (buyMap.get(key) ?? 0) + t.value)
      else sellMap.set(key, (sellMap.get(key) ?? 0) + t.value)
    }
    return sliced.map((p) => {
      const key = p.date.slice(0, 7)
      const buy = +(buyMap.get(key) ?? 0).toFixed(2)
      const sell = +(sellMap.get(key) ?? 0).toFixed(2)
      return {
        date: p.date,
        label: monthLabel(p.date),
        price: p.price,
        buy,
        sell: -sell, // negative for downward bar
      }
    })
  }, [sliced, trades])

  const totals = useMemo(() => {
    let buys = 0
    let sells = 0
    for (const r of data) {
      buys += r.buy
      sells += -r.sell
    }
    return { buys: +buys.toFixed(1), sells: +sells.toFixed(1), net: +(buys - sells).toFixed(1) }
  }, [data])

  const tickInterval = Math.max(0, Math.floor(data.length / 8))

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Price + Insider activity · {horizon}
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            Where did insiders transact relative to price?
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            Buys ₹{totals.buys} Cr
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
            <span className="h-2 w-2 rounded-sm bg-rose-500" />
            Sells ₹{totals.sells} Cr
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
              totals.net >= 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            Net {totals.net >= 0 ? '+' : ''}₹{totals.net} Cr
          </span>
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 36, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#eef0f6" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#7c869f' }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              minTickGap={20}
            />
            {/* left axis = trade values (Cr) */}
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: '#7c869f' }}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => `${v}`}
            />
            {/* right axis = price */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: '#7c869f' }}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const v = Number(value)
                const n = String(name)
                if (n === 'Price') return [`₹${v.toFixed(0)}`, n]
                if (n === 'Buys') return [`₹${v.toFixed(2)} Cr`, n]
                if (n === 'Sells') return [`₹${Math.abs(v).toFixed(2)} Cr`, n]
                return [`${value}`, n]
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <Bar yAxisId="left" dataKey="buy" name="Buys" fill="#10b981" radius={[3, 3, 0, 0]} barSize={6} />
            <Bar yAxisId="left" dataKey="sell" name="Sells" fill="#ef4444" radius={[0, 0, 3, 3]} barSize={6} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="price"
              name="Price"
              stroke="#0f172a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 rounded-xl bg-ink-50/60 px-4 py-3 text-[13px] text-ink-700">
        <span className="font-semibold text-ink-900">Read: </span>
        {annotation}
      </div>
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
