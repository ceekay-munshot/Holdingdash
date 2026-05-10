import { useMemo, useState } from 'react'
import {
  Search,
  Sparkles,
  Building2,
  Globe2,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  Check,
} from 'lucide-react'
import { companyMaster } from '../data/companyMaster'
import type { Company } from '../types'

interface Props {
  onLaunch: (company: Company) => void
}

export default function CompanyLaunchPanel({ onLaunch }: Props) {
  const [selected, setSelected] = useState<Company | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return companyMaster
    return companyMaster.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q),
    )
  }, [query])

  const canLaunch = !!selected

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-mesh-aurora">
      {/* faint grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(#e9ecf3 1px, transparent 1px), linear-gradient(90deg, #e9ecf3 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage:
            'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-12">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3 animate-fadeUp">
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-glow">
              <TrendingUp className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400 ring-4 ring-emerald-100" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold tracking-[0.2em] text-emerald-700">
              HOLDINGDASH
            </div>
            <div className="text-xs text-ink-500">Ownership Signal Engine</div>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10 max-w-2xl text-center animate-fadeUp" style={{ animationDelay: '60ms' }}>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Buy-side ownership intelligence
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-ink-900 md:text-5xl">
            Read the <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">ownership story</span> behind any stock
          </h1>
          <p className="mt-3 text-base text-ink-500">
            Pick a company. We'll surface the trend, the holders, the insiders, and the governance — in one read.
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-2xl animate-fadeUp" style={{ animationDelay: '120ms' }}>
          <div className="glass-card p-7">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-400">
              Step 1 · Select a company
            </div>
            <div className="mb-5 text-sm text-ink-500">
              Ticker, exchange and country auto-fill once you pick.
            </div>

            {/* Combobox */}
            <div className="relative">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                Company Name
              </label>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="group flex w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-3 text-left text-sm shadow-soft transition-all hover:border-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-ink-400 group-hover:text-emerald-600" />
                  <span className={selected ? 'font-semibold text-ink-900' : 'text-ink-400'}>
                    {selected ? selected.name : 'Search 10 listed companies...'}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>

              {open && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card animate-fadeUp">
                  <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2.5">
                    <Search className="h-4 w-4 text-ink-400" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Type a name or ticker..."
                      className="flex-1 bg-transparent text-sm placeholder-ink-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1 drawer-scroll">
                    {filtered.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-ink-400">
                        No matches. Try Reliance, Infosys, HDFC...
                      </div>
                    )}
                    {filtered.map((c) => {
                      const isActive = selected?.ticker === c.ticker
                      return (
                        <button
                          key={c.ticker}
                          onClick={() => {
                            setSelected(c)
                            setOpen(false)
                            setQuery('')
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                            isActive
                              ? 'bg-emerald-50 text-ink-900'
                              : 'hover:bg-ink-50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-ink-800">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-ink-400">
                              {c.exchange} · {c.country}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">
                              {c.ticker}
                            </span>
                            {isActive && (
                              <Check className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Auto-fill row */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <AutoField
                label="Ticker"
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                value={selected?.ticker ?? '—'}
                mono
              />
              <AutoField
                label="Exchange"
                icon={<Building2 className="h-3.5 w-3.5" />}
                value={selected?.exchange ?? '—'}
              />
              <AutoField
                label="Country"
                icon={<Globe2 className="h-3.5 w-3.5" />}
                value={selected?.country ?? '—'}
              />
            </div>

            {/* CTA */}
            <button
              type="button"
              disabled={!canLaunch}
              onClick={() => selected && onLaunch(selected)}
              className="btn-primary mt-6 w-full py-3 text-base"
            >
              <Sparkles className="h-4 w-4" />
              Generate Ownership Signal
              <ArrowRight className="h-4 w-4" />
            </button>

            {!canLaunch && (
              <div className="mt-3 text-center text-[11px] text-ink-400">
                Pick a company to enable.
              </div>
            )}
          </div>

          {/* Footer micro-features */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-ink-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 20-quarter ownership trend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Holder movement
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Insider & deals
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Governance risk
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AutoField({
  label,
  icon,
  value,
  mono,
}: {
  label: string
  icon: React.ReactNode
  value: string
  mono?: boolean
}) {
  const filled = value !== '—'
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 transition-colors ${
        filled
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-ink-200 bg-ink-50/40'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {icon}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-sm ${
          filled ? 'font-semibold text-ink-900' : 'text-ink-400'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}
