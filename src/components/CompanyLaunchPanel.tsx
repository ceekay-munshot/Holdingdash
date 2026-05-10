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
  Clock,
  Scale,
  X,
  ArrowLeftRight,
} from 'lucide-react'
import { companyMaster } from '../data/companyMaster'
import type { Company } from '../types'
import { useRecents } from '../lib/recents'

type Mode = 'single' | 'compare'

interface Props {
  onLaunch: (company: Company) => void
  onCompare: (a: Company, b: Company) => void
}

export default function CompanyLaunchPanel({ onLaunch, onCompare }: Props) {
  const [mode, setMode] = useState<Mode>('single')
  const [selectedA, setSelectedA] = useState<Company | null>(null)
  const [selectedB, setSelectedB] = useState<Company | null>(null)
  const { recents } = useRecents()

  const canLaunch =
    mode === 'single'
      ? !!selectedA
      : !!selectedA && !!selectedB && selectedA.ticker !== selectedB.ticker

  function handleCta() {
    if (mode === 'single' && selectedA) onLaunch(selectedA)
    else if (mode === 'compare' && selectedA && selectedB) onCompare(selectedA, selectedB)
  }

  function handleRecentClick(c: Company) {
    if (mode === 'single') {
      setSelectedA(c)
    } else {
      // fill A first, then B if A is taken by something else
      if (!selectedA) setSelectedA(c)
      else if (selectedA.ticker !== c.ticker) setSelectedB(c)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-mesh-aurora">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(#e9ecf3 1px, transparent 1px), linear-gradient(90deg, #e9ecf3 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
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
            <div className="text-[11px] font-bold tracking-[0.2em] text-emerald-700">HOLDINGDASH</div>
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
        <div className={`w-full animate-fadeUp ${mode === 'compare' ? 'max-w-3xl' : 'max-w-2xl'}`} style={{ animationDelay: '120ms' }}>
          <div className="glass-card p-7">
            {/* Mode toggle */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Step 1 · {mode === 'single' ? 'Select a company' : 'Pick two to compare'}
                </div>
                <div className="text-sm text-ink-500">
                  {mode === 'single'
                    ? 'Ticker, exchange and country auto-fill once you pick.'
                    : 'See ownership, insider and governance signals side by side.'}
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-ink-100/70 p-1">
                <button
                  onClick={() => setMode('single')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    mode === 'single' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Single
                </button>
                <button
                  onClick={() => setMode('compare')}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    mode === 'compare' ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <Scale className="h-3.5 w-3.5" />
                  Compare
                </button>
              </div>
            </div>

            {/* Recents rail */}
            {recents.length > 0 && (
              <div className="mb-5">
                <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
                  <Clock className="h-3 w-3" />
                  Recent
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recents.map((c) => {
                    const aMatch = selectedA?.ticker === c.ticker
                    const bMatch = mode === 'compare' && selectedB?.ticker === c.ticker
                    const matched = aMatch || bMatch
                    return (
                      <button
                        key={c.ticker}
                        onClick={() => handleRecentClick(c)}
                        className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          matched
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-ink-200 bg-white text-ink-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        {c.name}
                        <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[9.5px] text-ink-600 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                          {c.ticker.replace('.NS', '')}
                        </span>
                        {matched && <Check className="h-3 w-3 text-emerald-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Pickers */}
            {mode === 'single' ? (
              <SinglePicker
                selected={selectedA}
                onChange={setSelectedA}
              />
            ) : (
              <ComparePicker
                a={selectedA}
                b={selectedB}
                onChangeA={setSelectedA}
                onChangeB={setSelectedB}
                onSwap={() => {
                  setSelectedA(selectedB)
                  setSelectedB(selectedA)
                }}
              />
            )}

            {/* CTA */}
            <button
              type="button"
              disabled={!canLaunch}
              onClick={handleCta}
              className="btn-primary mt-6 w-full py-3 text-base"
            >
              <Sparkles className="h-4 w-4" />
              {mode === 'single' ? 'Generate Ownership Signal' : 'Generate Compare View'}
              <ArrowRight className="h-4 w-4" />
            </button>

            {!canLaunch && (
              <div className="mt-3 text-center text-[11px] text-ink-400">
                {mode === 'single'
                  ? 'Pick a company to enable.'
                  : selectedA && selectedB && selectedA.ticker === selectedB.ticker
                  ? 'Pick two different companies.'
                  : 'Pick two companies to enable.'}
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

/* ===== single picker ===== */

function SinglePicker({
  selected,
  onChange,
}: {
  selected: Company | null
  onChange: (c: Company) => void
}) {
  return (
    <>
      <Combobox label="Company Name" selected={selected} onChange={onChange} />
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
    </>
  )
}

/* ===== compare picker ===== */

function ComparePicker({
  a,
  b,
  onChangeA,
  onChangeB,
  onSwap,
}: {
  a: Company | null
  b: Company | null
  onChangeA: (c: Company | null) => void
  onChangeB: (c: Company | null) => void
  onSwap: () => void
}) {
  return (
    <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
      <ComparePickerSide
        label="Company A"
        selected={a}
        onChange={onChangeA}
        accent="emerald"
        otherTicker={b?.ticker}
      />
      <button
        type="button"
        onClick={onSwap}
        disabled={!a && !b}
        className="hidden self-center rounded-full border border-ink-200 bg-white p-2 text-ink-500 shadow-soft transition-colors hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-40 md:block"
        aria-label="Swap A and B"
        title="Swap"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
      <ComparePickerSide
        label="Company B"
        selected={b}
        onChange={onChangeB}
        accent="indigo"
        otherTicker={a?.ticker}
      />
    </div>
  )
}

function ComparePickerSide({
  label,
  selected,
  onChange,
  accent,
  otherTicker,
}: {
  label: string
  selected: Company | null
  onChange: (c: Company | null) => void
  accent: 'emerald' | 'indigo'
  otherTicker?: string
}) {
  const accentRing = accent === 'emerald' ? 'ring-emerald-200' : 'ring-indigo-200'
  const accentText = accent === 'emerald' ? 'text-emerald-700' : 'text-indigo-700'
  const accentBg = accent === 'emerald' ? 'bg-emerald-50/60' : 'bg-indigo-50/60'
  const accentBorder = accent === 'emerald' ? 'border-emerald-200' : 'border-indigo-200'
  return (
    <div className={`rounded-2xl border bg-white p-4 transition-shadow ${selected ? `${accentBorder} ring-1 ${accentRing}` : 'border-ink-200'}`}>
      <div className={`mb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider ${accentText}`}>
        <span>{label}</span>
        {selected && (
          <button
            onClick={() => onChange(null)}
            className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label="Clear selection"
            title="Clear"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <Combobox label="" selected={selected} onChange={onChange} compact disabledTicker={otherTicker} />
      {selected ? (
        <div className={`mt-3 rounded-xl border ${accentBorder} ${accentBg} px-3 py-2`}>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Auto-filled</div>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="font-mono text-[12px] font-semibold text-ink-900">{selected.ticker}</span>
            <span className="text-[11px] text-ink-500">· {selected.exchange} · {selected.country}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-ink-200 px-3 py-2 text-[11px] text-ink-400">
          Pick a company to fill ticker / exchange / country.
        </div>
      )}
    </div>
  )
}

/* ===== combobox shared ===== */

function Combobox({
  label,
  selected,
  onChange,
  compact,
  disabledTicker,
}: {
  label: string
  selected: Company | null
  onChange: (c: Company) => void
  compact?: boolean
  disabledTicker?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return companyMaster
    return companyMaster.filter(
      (c) => c.name.toLowerCase().includes(q) || c.ticker.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="relative">
      {label && (
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex w-full items-center justify-between rounded-xl border border-ink-200 bg-white text-left text-sm shadow-soft transition-all hover:border-emerald-300 focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
          compact ? 'px-3 py-2.5' : 'px-4 py-3'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Building2 className="h-4 w-4 text-ink-400 group-hover:text-emerald-600" />
          <span className={selected ? 'truncate font-semibold text-ink-900' : 'truncate text-ink-400'}>
            {selected ? selected.name : compact ? 'Pick a company...' : 'Search 10 listed companies...'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
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
              const isDisabled = disabledTicker === c.ticker && !isActive
              return (
                <button
                  key={c.ticker}
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(c)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-ink-900'
                      : isDisabled
                      ? 'cursor-not-allowed bg-ink-50/40 text-ink-400'
                      : 'hover:bg-ink-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-ink-800">{c.name}</span>
                    <span className="text-[11px] text-ink-400">
                      {c.exchange} · {c.country}
                      {isDisabled && ' · already in compare'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">{c.ticker}</span>
                    {isActive && <Check className="h-4 w-4 text-emerald-600" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
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
        filled ? 'border-emerald-200 bg-emerald-50/60' : 'border-ink-200 bg-ink-50/40'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {icon}
        {label}
      </div>
      <div className={`mt-1 truncate text-sm ${filled ? 'font-semibold text-ink-900' : 'text-ink-400'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  )
}
