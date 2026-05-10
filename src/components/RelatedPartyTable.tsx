import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  Flame,
  Pin,
  Search,
} from 'lucide-react'
import type { RPTSignal, RelatedPartyTransaction } from '../types'

interface Props {
  parties: RelatedPartyTransaction[]
}

type FilterKey = 'All' | 'Normal' | 'Watch' | 'High Risk'
const FILTERS: FilterKey[] = ['All', 'Normal', 'Watch', 'High Risk']

const SIGNAL_STYLE: Record<
  RPTSignal,
  { bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  Normal: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  Watch: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Eye className="h-3 w-3" />,
  },
  'Rising Fast': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: <Flame className="h-3 w-3" />,
  },
  Concentrated: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    icon: <Pin className="h-3 w-3" />,
  },
  'High Risk': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
}

const RELATIONSHIP_TINT: Record<string, string> = {
  Subsidiary: 'bg-sky-100 text-sky-700',
  'Joint Venture': 'bg-teal-100 text-teal-700',
  Associate: 'bg-indigo-100 text-indigo-700',
  'KMP / Director': 'bg-amber-100 text-amber-700',
  'Holding Company': 'bg-violet-100 text-violet-700',
  'Promoter Entity': 'bg-rose-100 text-rose-700',
  'Common Director': 'bg-emerald-100 text-emerald-700',
}

type SortKey = 'value' | 'change' | 'balance'

export default function RelatedPartyTable({ parties }: Props) {
  const [filter, setFilter] = useState<FilterKey>('All')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { All: parties.length, Normal: 0, Watch: 0, 'High Risk': 0 }
    for (const p of parties) {
      if (p.signal === 'Normal') c.Normal += 1
      else if (p.signal === 'High Risk') c['High Risk'] += 1
      else c.Watch += 1
    }
    return c
  }, [parties])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = parties
    if (filter === 'Normal') rows = rows.filter((p) => p.signal === 'Normal')
    else if (filter === 'High Risk') rows = rows.filter((p) => p.signal === 'High Risk')
    else if (filter === 'Watch') rows = rows.filter((p) => p.signal !== 'Normal' && p.signal !== 'High Risk')
    if (q)
      rows = rows.filter(
        (p) =>
          p.counterparty.toLowerCase().includes(q) ||
          p.relationship.toLowerCase().includes(q) ||
          p.transactionType.toLowerCase().includes(q),
      )
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      const av = sortKey === 'value' ? a.currentValue : sortKey === 'change' ? a.changePct : a.balanceOutstanding
      const bv = sortKey === 'value' ? b.currentValue : sortKey === 'change' ? b.changePct : b.balanceOutstanding
      return (av - bv) * dir
    })
    return rows
  }, [parties, filter, query, sortKey, sortDir])

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Top related parties
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            Who are the counterparties and how are they trending?
          </h3>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search counterparty..."
            className="rounded-xl border border-ink-200 bg-white py-2 pl-8 pr-3 text-xs placeholder-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-ink-50/60 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="px-4 py-3">Counterparty</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Transaction</th>
                <Th align="right" onClick={() => toggleSort('value')} active={sortKey === 'value'} dir={sortDir}>
                  Current
                </Th>
                <th className="px-4 py-3 text-right">Previous</th>
                <Th align="right" onClick={() => toggleSort('change')} active={sortKey === 'change'} dir={sortDir}>
                  Change
                </Th>
                <Th align="right" onClick={() => toggleSort('balance')} active={sortKey === 'balance'} dir={sortDir}>
                  Balance
                </Th>
                <th className="px-4 py-3">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-ink-400">
                    No related parties match.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const sig = SIGNAL_STYLE[p.signal]
                const up = p.changePct > 0
                return (
                  <tr key={p.counterparty} className="group transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-3 font-semibold text-ink-900">{p.counterparty}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                          RELATIONSHIP_TINT[p.relationship] ?? 'bg-ink-100 text-ink-600'
                        }`}
                      >
                        {p.relationship}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{p.transactionType}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink-900">
                      ₹{p.currentValue.toLocaleString('en-IN')} Cr
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                      ₹{p.prevValue.toLocaleString('en-IN')} Cr
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {up && '+'}
                        {p.changePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                      {p.balanceOutstanding === 0 ? '—' : `₹${p.balanceOutstanding.toLocaleString('en-IN')} Cr`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${sig.bg} ${sig.text} ${sig.border}`}
                      >
                        {sig.icon}
                        {p.signal}
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
          Showing {filtered.length} of {parties.length} counterparties
        </span>
        <span>Click headers to sort</span>
      </div>
    </section>
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
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`} style={{ cursor: onClick ? 'pointer' : 'default' }}>
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
