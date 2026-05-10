import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Eye,
  LogIn,
  LogOut,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { HolderRow, HolderSignal, HolderType } from '../types'

interface Props {
  holders: HolderRow[]
}

type FilterKey = 'All' | 'Promoter' | 'FII' | 'DII' | 'Individual'

const FILTERS: FilterKey[] = ['All', 'Promoter', 'FII', 'DII', 'Individual']

const SIGNAL_STYLE: Record<
  HolderSignal,
  { bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  Accumulating: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <TrendingUp className="h-3 w-3" />,
  },
  Reducing: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: <TrendingDown className="h-3 w-3" />,
  },
  Stable: {
    bg: 'bg-ink-50',
    text: 'text-ink-600',
    border: 'border-ink-200',
    icon: <Minus className="h-3 w-3" />,
  },
  'New Entry': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: <LogIn className="h-3 w-3" />,
  },
  Exited: {
    bg: 'bg-ink-100',
    text: 'text-ink-700',
    border: 'border-ink-300',
    icon: <LogOut className="h-3 w-3" />,
  },
  Watch: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Eye className="h-3 w-3" />,
  },
}

const TYPE_TINT: Record<HolderType, string> = {
  Promoter: 'bg-sky-100 text-sky-700',
  FII: 'bg-indigo-100 text-indigo-700',
  DII: 'bg-emerald-100 text-emerald-700',
  MF: 'bg-emerald-100 text-emerald-700',
  Insurance: 'bg-teal-100 text-teal-700',
  Individual: 'bg-amber-100 text-amber-700',
}

function bucketOf(type: HolderType): FilterKey {
  if (type === 'Promoter') return 'Promoter'
  if (type === 'FII') return 'FII'
  if (type === 'MF' || type === 'Insurance') return 'DII'
  return 'Individual'
}

type SortKey = 'change' | 'curr' | 'prev' | 'name'

export default function HolderMovementTable({ holders }: Props) {
  const [filter, setFilter] = useState<FilterKey>('All')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('change')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { All: holders.length, Promoter: 0, FII: 0, DII: 0, Individual: 0 }
    for (const h of holders) c[bucketOf(h.type)] += 1
    return c
  }, [holders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = holders.filter((h) => (filter === 'All' ? true : bucketOf(h.type) === filter))
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'desc' ? -1 : 1
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      const av = sortKey === 'change' ? a.changePct : sortKey === 'curr' ? a.currPct ?? -1 : a.prevPct ?? -1
      const bv = sortKey === 'change' ? b.changePct : sortKey === 'curr' ? b.currPct ?? -1 : b.prevPct ?? -1
      return (av - bv) * dir
    })
    return rows
  }, [holders, filter, query, sortKey, sortDir])

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
            Top holder movement · this quarter
          </div>
          <h3 className="text-lg font-semibold text-ink-900">Who moved and by how much</h3>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search holder..."
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

      {/* table */}
      <div className="overflow-hidden rounded-2xl border border-ink-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-ink-50/60 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <Th onClick={() => toggleSort('name')} active={sortKey === 'name'} dir={sortDir}>
                  Holder
                </Th>
                <Th>Type</Th>
                <Th
                  align="right"
                  onClick={() => toggleSort('prev')}
                  active={sortKey === 'prev'}
                  dir={sortDir}
                >
                  Previous Q
                </Th>
                <Th
                  align="right"
                  onClick={() => toggleSort('curr')}
                  active={sortKey === 'curr'}
                  dir={sortDir}
                >
                  Current Q
                </Th>
                <Th
                  align="right"
                  onClick={() => toggleSort('change')}
                  active={sortKey === 'change'}
                  dir={sortDir}
                >
                  Change
                </Th>
                <Th>Signal</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-ink-400">
                    No holders match.
                  </td>
                </tr>
              )}
              {filtered.map((h) => {
                const signalStyle = SIGNAL_STYLE[h.signal]
                const up = h.changePct > 0
                const down = h.changePct < 0
                return (
                  <tr
                    key={`${h.name}-${h.type}`}
                    className="group transition-colors hover:bg-emerald-50/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ink-900">{h.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${TYPE_TINT[h.type]}`}
                      >
                        {h.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-700">
                      {h.prevPct === null ? '—' : `${h.prevPct.toFixed(2)}%`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                      {h.currPct === null ? '—' : `${h.currPct.toFixed(2)}%`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          up
                            ? 'bg-emerald-50 text-emerald-700'
                            : down
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-ink-50 text-ink-600'
                        }`}
                      >
                        {up && <ArrowUp className="h-3 w-3" />}
                        {down && <ArrowDown className="h-3 w-3" />}
                        {!up && !down && <Minus className="h-3 w-3" />}
                        {up && '+'}
                        {h.changePct.toFixed(2)}pp
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${signalStyle.bg} ${signalStyle.text} ${signalStyle.border}`}
                      >
                        {signalStyle.icon}
                        {h.signal}
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
        <span>Showing {filtered.length} of {holders.length} holders</span>
        <span className="inline-flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" />
          Click headers to sort
        </span>
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
