import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Layers,
  MinusCircle,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { InsiderClassification, InsiderTrade } from '../types'

interface Props {
  trades: InsiderTrade[]
}

type FilterKey = 'All' | 'Buys' | 'Sells' | 'Cluster' | 'Notable'

const FILTERS: FilterKey[] = ['All', 'Buys', 'Sells', 'Cluster', 'Notable']

const CLASS_STYLE: Record<
  InsiderClassification,
  { bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  'Strong Buy': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  'Moderate Buy': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  'Routine Sell': {
    bg: 'bg-ink-50',
    text: 'text-ink-600',
    border: 'border-ink-200',
    icon: <MinusCircle className="h-3 w-3" />,
  },
  'Meaningful Sell': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <TrendingDown className="h-3 w-3" />,
  },
  'Cluster Sell': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <Layers className="h-3 w-3" />,
  },
  Watch: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: <Eye className="h-3 w-3" />,
  },
  Ignore: {
    bg: 'bg-ink-100',
    text: 'text-ink-500',
    border: 'border-ink-200',
    icon: <MinusCircle className="h-3 w-3" />,
  },
}

const ROLE_TINT: Record<string, string> = {
  Promoter: 'bg-sky-100 text-sky-700',
  'Promoter Group': 'bg-sky-100 text-sky-700',
  'CEO/MD': 'bg-indigo-100 text-indigo-700',
  CFO: 'bg-violet-100 text-violet-700',
  Director: 'bg-emerald-100 text-emerald-700',
  KMP: 'bg-amber-100 text-amber-700',
}

const NOTABLE_CLASSES: InsiderClassification[] = [
  'Strong Buy',
  'Moderate Buy',
  'Cluster Sell',
  'Meaningful Sell',
  'Watch',
]

type SortKey = 'date' | 'value' | 'price'

export default function InsiderTransactionTable({ trades }: Props) {
  const [filter, setFilter] = useState<FilterKey>('All')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      All: trades.length,
      Buys: 0,
      Sells: 0,
      Cluster: 0,
      Notable: 0,
    }
    for (const t of trades) {
      if (t.type === 'Buy') c.Buys += 1
      if (t.type === 'Sell') c.Sells += 1
      if (t.classification === 'Cluster Sell') c.Cluster += 1
      if (NOTABLE_CLASSES.includes(t.classification)) c.Notable += 1
    }
    return c
  }, [trades])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = trades
    if (filter === 'Buys') rows = rows.filter((t) => t.type === 'Buy')
    else if (filter === 'Sells') rows = rows.filter((t) => t.type === 'Sell')
    else if (filter === 'Cluster') rows = rows.filter((t) => t.classification === 'Cluster Sell')
    else if (filter === 'Notable') rows = rows.filter((t) => NOTABLE_CLASSES.includes(t.classification))
    if (q) rows = rows.filter((t) => t.insider.toLowerCase().includes(q) || t.role.toLowerCase().includes(q))
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'date') return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * dir
      const av = sortKey === 'value' ? a.value : a.price
      const bv = sortKey === 'value' ? b.value : b.price
      return (av - bv) * dir
    })
    return rows
  }, [trades, filter, query, sortKey, sortDir])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Insider transactions
          </div>
          <h3 className="text-lg font-semibold text-ink-900">Classified by signal value</h3>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search insider or role..."
            className="rounded-xl border border-ink-200 bg-white py-2 pl-8 pr-3 text-xs placeholder-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      {/* filter pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {f}
              <span
                className={`rounded-md px-1.5 text-[10px] tabular-nums ${
                  active ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500'
                }`}
              >
                {counts[f]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink-100">
        <div className="max-h-[440px] overflow-y-auto drawer-scroll">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-ink-50/80 backdrop-blur text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <Th onClick={() => toggleSort('date')} active={sortKey === 'date'} dir={sortDir}>Date</Th>
                <Th>Insider</Th>
                <Th>Role</Th>
                <Th>Type</Th>
                <Th onClick={() => toggleSort('value')} active={sortKey === 'value'} dir={sortDir} align="right">
                  Value
                </Th>
                <Th onClick={() => toggleSort('price')} active={sortKey === 'price'} dir={sortDir} align="right">
                  Price
                </Th>
                <Th>Classification</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-ink-400">
                    No transactions match.
                  </td>
                </tr>
              )}
              {filtered.map((t, i) => {
                const cls = CLASS_STYLE[t.classification]
                const buy = t.type === 'Buy'
                return (
                  <tr
                    key={`${t.date}-${t.insider}-${i}`}
                    className="group transition-colors hover:bg-emerald-50/30"
                  >
                    <td className="px-4 py-3 tabular-nums text-ink-700">{t.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-900">{t.insider}</div>
                      <div className="text-[11px] text-ink-500">{t.note}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                          ROLE_TINT[t.role] ?? 'bg-ink-100 text-ink-600'
                        }`}
                      >
                        {t.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                          buy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {buy ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                      ₹{t.value.toFixed(2)} Cr
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                      ₹{t.price.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${cls.bg} ${cls.text} ${cls.border}`}
                      >
                        {cls.icon}
                        {t.classification}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-400">
        <span>
          Showing {filtered.length} of {trades.length} transactions
        </span>
        <span>Click headers to sort</span>
      </div>
    </div>
  )
}

function Th({
  children,
  align = 'left',
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  onClick?: () => void
  active?: boolean
  dir?: 'asc' | 'desc'
}) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <th
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Tag
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${onClick ? 'hover:text-ink-800' : ''} ${active ? 'text-ink-800' : ''}`}
      >
        {children}
        {active && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </Tag>
    </th>
  )
}
