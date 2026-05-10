import { useEffect } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import type {
  Company,
  CompanyOverview,
  GovernanceData,
  InsiderDealsData,
  OwnershipTrendsData,
  TabKey,
} from '../types'
import { computeVerdict, type DimensionTone, type VerdictCall } from '../lib/verdict'

interface Props {
  open: boolean
  company: Company
  overview: CompanyOverview
  trends: OwnershipTrendsData
  insider: InsiderDealsData
  governance: GovernanceData
  onClose: () => void
  onJumpTab: (tab: TabKey) => void
}

const CALL_CHROME: Record<
  VerdictCall,
  { gradient: string; text: string; chip: string; aurora: string }
> = {
  'Strong Buy': {
    gradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    text: 'text-emerald-700',
    chip: 'bg-emerald-500',
    aurora:
      'radial-gradient(at 8% 0%, rgba(16,185,129,0.28), transparent 55%), radial-gradient(at 92% 0%, rgba(20,184,166,0.20), transparent 55%)',
  },
  Buy: {
    gradient: 'from-emerald-500 to-teal-600',
    text: 'text-emerald-700',
    chip: 'bg-emerald-500',
    aurora:
      'radial-gradient(at 8% 0%, rgba(16,185,129,0.22), transparent 55%), radial-gradient(at 92% 0%, rgba(20,184,166,0.16), transparent 55%)',
  },
  Hold: {
    gradient: 'from-sky-500 to-indigo-600',
    text: 'text-sky-700',
    chip: 'bg-sky-500',
    aurora:
      'radial-gradient(at 8% 0%, rgba(14,165,233,0.22), transparent 55%), radial-gradient(at 92% 0%, rgba(99,102,241,0.16), transparent 55%)',
  },
  Trim: {
    gradient: 'from-amber-500 to-orange-500',
    text: 'text-amber-700',
    chip: 'bg-amber-500',
    aurora:
      'radial-gradient(at 8% 0%, rgba(245,158,11,0.22), transparent 55%), radial-gradient(at 92% 0%, rgba(244,63,94,0.16), transparent 55%)',
  },
  Avoid: {
    gradient: 'from-rose-500 to-pink-600',
    text: 'text-rose-700',
    chip: 'bg-rose-500',
    aurora:
      'radial-gradient(at 8% 0%, rgba(244,63,94,0.26), transparent 55%), radial-gradient(at 92% 0%, rgba(239,68,68,0.20), transparent 55%)',
  },
}

const TONE_STYLE: Record<
  DimensionTone,
  { bar: string; text: string; bg: string; border: string }
> = {
  positive: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-200' },
  neutral: { bar: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50/60', border: 'border-sky-200' },
  watch: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50/60', border: 'border-amber-200' },
  risky: { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/60', border: 'border-rose-200' },
}

const DIM_TAB: Record<'ownership' | 'trend' | 'insider' | 'governance', TabKey> = {
  ownership: 'overview',
  trend: 'trends',
  insider: 'insider',
  governance: 'governance',
}

export default function InvestmentVerdictDrawer({
  open,
  company,
  overview,
  trends,
  insider,
  governance,
  onClose,
  onJumpTab,
}: Props) {
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

  if (!open) return null

  const verdict = computeVerdict(overview, trends, insider, governance)
  const chrome = CALL_CHROME[verdict.call]

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[640px] animate-slideIn flex-col bg-white shadow-[-32px_0_60px_-20px_rgba(20,26,42,0.18)]">
        {/* header */}
        <div className="relative overflow-hidden border-b border-ink-100 px-6 py-5">
          <div aria-hidden className="absolute inset-0 -z-10" style={{ background: chrome.aurora }} />
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`pill border bg-white/80 ${chrome.text}`}>
                  <Sparkles className="h-3 w-3" />
                  Composite read
                </span>
                <span className="pill border border-ink-200 bg-white/80 text-ink-700">
                  {company.name}
                </span>
              </div>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-ink-900">
                Investment Verdict
              </h3>
              <p className="mt-1 max-w-md text-sm text-ink-600">
                Cross-tab synthesis of ownership, trend, insider and governance signals into one buy-side call.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 text-ink-500 transition-colors hover:bg-white hover:text-ink-800"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="drawer-scroll flex-1 overflow-y-auto px-6 py-5">
          {/* call card */}
          <div className={`relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 shadow-card`}>
            <div className={`absolute inset-x-0 top-0 h-[4px] bg-gradient-to-r ${chrome.gradient}`} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Call</div>
                <div className={`mt-1 text-4xl font-bold tracking-tight ${chrome.text}`}>{verdict.call}</div>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-700">{verdict.oneLiner}</p>
              </div>
              {/* score gauge */}
              <ScoreGauge total={verdict.totalScore} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ConvictionBadge conviction={verdict.conviction} />
              <span className="pill border border-ink-200 bg-white text-ink-700">
                <Gauge className="h-3 w-3" />
                Score {verdict.totalScore} / 12
              </span>
            </div>
          </div>

          {/* dimension breakdown */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <Target className="h-3 w-3" />
              Dimension breakdown
            </div>
            <div className="grid gap-2.5">
              {verdict.dimensions.map((d) => {
                const tone = TONE_STYLE[d.tone]
                const widthPct = (d.score / 3) * 100
                return (
                  <button
                    key={d.key}
                    onClick={() => {
                      onClose()
                      onJumpTab(DIM_TAB[d.key])
                    }}
                    className={`group flex w-full items-start gap-3 rounded-2xl border ${tone.border} ${tone.bg} p-4 text-left transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${tone.bar}`} />
                          <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${tone.text}`}>
                            {d.label}
                          </span>
                        </div>
                        <span className={`text-[11px] font-semibold ${tone.text}`}>
                          {d.signal}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-ink-800">{d.read}</p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
                          <div
                            className={`h-full rounded-full ${tone.bar} transition-all`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="text-[10.5px] font-semibold tabular-nums text-ink-600">
                          {d.score}/3
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-emerald-600" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* position guidance */}
          <div className="mt-5 rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <ShieldCheck className="h-3 w-3" />
              Position guidance
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-800">{verdict.positionGuidance}</p>
          </div>

          {/* watch items */}
          {verdict.watchItems.length > 0 && (
            <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                <Eye className="h-3 w-3" />
                Watch items
              </div>
              <ul className="mt-2 space-y-1.5">
                {verdict.watchItems.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-5 text-[10.5px] text-ink-400">
            Composite verdict is computed from each tab's signal mapped onto a 0-3 scale. This is a buy-side ownership-quality read, not a price target.
          </p>
        </div>
      </aside>
    </div>
  )
}

/* ===== sub-components ===== */

function ScoreGauge({ total }: { total: number }) {
  const pct = (total / 12) * 100
  const stroke = total >= 9 ? '#10b981' : total >= 6 ? '#0ea5e9' : total >= 3 ? '#f59e0b' : '#ef4444'
  const ringTrack = '#eef0f6'
  const r = 28
  const c = 2 * Math.PI * r
  const filled = (pct / 100) * c
  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} stroke={ringTrack} strokeWidth="6" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-ink-900">{total}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-400">/ 12</span>
      </div>
    </div>
  )
}

function ConvictionBadge({ conviction }: { conviction: 'High' | 'Medium' | 'Low' }) {
  const styles =
    conviction === 'High'
      ? { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <TrendingUp className="h-3 w-3" /> }
      : conviction === 'Medium'
      ? { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', icon: <TrendingUp className="h-3 w-3" /> }
      : { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <TrendingDown className="h-3 w-3" /> }
  return (
    <span className={`pill border ${styles.bg} ${styles.text} ${styles.border}`}>
      {styles.icon}
      Conviction · {conviction}
    </span>
  )
}
