import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ExternalLink,
  FileText,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import type { LiveInsiderRow } from '../lib/liveData'

interface Props {
  rows: LiveInsiderRow[]
  /** "RELIANCE", "TCS" etc. — used to log if we ever render filings for a
   *  different ticker (shouldn't happen by construction, but defensive). */
  symbol: string
}

type Bucket = 'All' | 'SAST' | 'PIT' | 'Trading Window' | 'Other'
const BUCKETS: Bucket[] = ['All', 'SAST', 'PIT', 'Trading Window', 'Other']

/** Coarse classification used for filter pills + the small icon. */
function bucketOf(subcategory: string, headline: string): Exclude<Bucket, 'All'> {
  const s = (subcategory || '').toLowerCase()
  const h = (headline || '').toLowerCase()
  if (s.includes('trading window') || h.includes('trading window')) return 'Trading Window'
  if (
    s.includes('substantial acquisition') ||
    s.includes('sast') ||
    h.includes('regulation 29') ||
    h.includes('sast')
  ) {
    return 'SAST'
  }
  if (
    s.includes('acquisition') ||
    s.includes('disposal') ||
    s.includes('insider') ||
    h.includes('regulation 7(2)') ||
    h.includes('reg 7(2)') ||
    h.includes('prohibition of insider trading')
  ) {
    return 'PIT'
  }
  return 'Other'
}

/** "2024-12-22T21:38:38.807" → "2024-12-22". Tolerant of empty / malformed. */
function shortDate(iso: string): string {
  if (!iso) return '—'
  const i = iso.indexOf('T')
  return i > 0 ? iso.slice(0, i) : iso.slice(0, 10)
}

const BUCKET_STYLE: Record<
  Exclude<Bucket, 'All'>,
  { bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  SAST: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
  PIT: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  'Trading Window': {
    bg: 'bg-ink-50',
    text: 'text-ink-600',
    border: 'border-ink-200',
    icon: <CalendarClock className="h-3 w-3" />,
  },
  Other: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: <Sparkles className="h-3 w-3" />,
  },
}

export default function LiveFilingsTable({ rows, symbol }: Props) {
  const [filter, setFilter] = useState<Bucket>('All')
  const [query, setQuery] = useState('')

  const enriched = useMemo(() => {
    return rows
      .map((r) => ({
        ...r,
        _bucket: bucketOf(r.subcategory ?? '', r.headline ?? ''),
        _date: shortDate(r.intimationDate ?? ''),
      }))
      .sort((a, b) => (a._date < b._date ? 1 : a._date > b._date ? -1 : 0))
  }, [rows])

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = {
      All: enriched.length,
      SAST: 0,
      PIT: 0,
      'Trading Window': 0,
      Other: 0,
    }
    for (const r of enriched) c[r._bucket] += 1
    return c
  }, [enriched])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = enriched
    if (filter !== 'All') out = out.filter((r) => r._bucket === filter)
    if (q) out = out.filter((r) => (r.headline ?? '').toLowerCase().includes(q))
    return out
  }, [enriched, filter, query])

  // The PIT bucket is the only one that maps to actual transactions; surface it
  // as the "trade-flavoured" hint above the filter row.
  const pitCount = counts['PIT']
  const sastCount = counts['SAST']

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Insider-related filings · last 90 days
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            {symbol}: {enriched.length} filing{enriched.length === 1 ? '' : 's'} from BSE
          </h3>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-ink-600">
            BSE publishes insider-related filings (trading window closures, SAST
            disclosures, PIT acquisition/disposal notices) as PDFs. Per-trade
            detail lives inside the PDF — we surface the filing list here.
            {pitCount + sastCount > 0 && (
              <>
                {' '}
                <span className="font-semibold text-ink-800">
                  {pitCount} PIT + {sastCount} SAST
                </span>{' '}
                actually involve transactions.
              </>
            )}
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search headline..."
            className="rounded-xl border border-ink-200 bg-white py-2 pl-8 pr-3 text-xs placeholder-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      {/* filter pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {BUCKETS.map((f) => {
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
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Headline</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 bg-white">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-ink-400">
                    No filings match this filter.
                  </td>
                </tr>
              )}
              {filtered.map((r, i) => {
                const style = BUCKET_STYLE[r._bucket]
                return (
                  <tr key={r.newsId || `${r._date}-${i}`} className="group transition-colors hover:bg-emerald-50/30">
                    <td className="px-4 py-3 tabular-nums text-ink-700">{r._date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${style.bg} ${style.text} ${style.border}`}
                      >
                        {style.icon}
                        {r._bucket}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-900">{r.headline || r.subcategory || '—'}</div>
                      {r.subcategory && r.subcategory !== r.headline && (
                        <div className="mt-0.5 text-[11px] text-ink-500">{r.subcategory}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.attachmentUrl ? (
                        <a
                          href={r.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          title={r.attachmentBytes ? `~${Math.round((r.attachmentBytes || 0) / 1024)} KB` : undefined}
                        >
                          <FileText className="h-3 w-3" />
                          Open
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-ink-400">—</span>
                      )}
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
          Showing {filtered.length} of {enriched.length} filings
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowDownRight className="h-3 w-3" />
          Sorted newest first
        </span>
      </div>
    </div>
  )
}
