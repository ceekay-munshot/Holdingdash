import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  Layers,
  Network,
  Quote,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type {
  GovernanceCard,
  GovernanceData,
  GovernanceSignal,
  GovernanceTrendStripItem,
} from '../types'
import RPTTrendChart from './RPTTrendChart'
import RelatedPartyTable from './RelatedPartyTable'
import RPTFlowVisual from './RPTFlowVisual'
import DataBadge from './DataBadge'

interface Props {
  data: GovernanceData
  companyName: string
}

const SIGNAL_CHROME: Record<
  GovernanceSignal,
  { bg: string; chip: string; text: string; border: string; aurora: string; icon: typeof ShieldCheck }
> = {
  'Low Risk': {
    bg: 'bg-hero-positive',
    chip: 'bg-emerald-500',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(16,185,129,0.20), transparent 55%), radial-gradient(at 92% 0%, rgba(20,184,166,0.18), transparent 55%)',
    icon: ShieldCheck,
  },
  Watch: {
    bg: 'bg-hero-watch',
    chip: 'bg-amber-500',
    text: 'text-amber-700',
    border: 'border-amber-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(245,158,11,0.20), transparent 55%), radial-gradient(at 92% 0%, rgba(244,63,94,0.16), transparent 55%)',
    icon: AlertTriangle,
  },
  'High Risk': {
    bg: 'bg-hero-risky',
    chip: 'bg-orange-500',
    text: 'text-orange-700',
    border: 'border-orange-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(249,115,22,0.22), transparent 55%), radial-gradient(at 92% 0%, rgba(244,63,94,0.18), transparent 55%)',
    icon: ShieldAlert,
  },
  'Red Flag': {
    bg: 'bg-hero-risky',
    chip: 'bg-rose-600',
    text: 'text-rose-700',
    border: 'border-rose-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(244,63,94,0.26), transparent 55%), radial-gradient(at 92% 0%, rgba(239,68,68,0.20), transparent 55%)',
    icon: ShieldAlert,
  },
}

const CARD_ICON: Record<GovernanceCard['key'], typeof TrendingUp> = {
  rptGrowth: TrendingUp,
  rptShare: Layers,
  receivables: Wallet,
  concentration: Network,
}

const TONE = {
  positive: { strip: 'from-emerald-500 to-teal-600', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  neutral: { strip: 'from-sky-500 to-indigo-500', text: 'text-sky-700', dot: 'bg-sky-500' },
  watch: { strip: 'from-amber-500 to-orange-500', text: 'text-amber-700', dot: 'bg-amber-500' },
  risky: { strip: 'from-rose-500 to-pink-600', text: 'text-rose-700', dot: 'bg-rose-500' },
} as const

const STRIP_ICON: Record<GovernanceTrendStripItem['key'], typeof TrendingUp> = {
  rptIntensity: Layers,
  outstandingBalance: Wallet,
  concentration: Network,
  disclosureQuality: FileText,
}

export default function GovernanceRiskTab({ data, companyName }: Props) {
  const { summary, trend, parties, flows } = data
  const chrome = SIGNAL_CHROME[summary.signal]
  const SignalIcon = chrome.icon

  const last = trend[trend.length - 1]
  const trendAnnotation = `${last.period}: RPT at ₹${last.rpt.toLocaleString('en-IN')} Cr (${last.rptPctRevenue}% of revenue) vs revenue ₹${last.revenue.toLocaleString('en-IN')} Cr. ${trend.filter((t) => t.outpacing).length} of last ${trend.length - 1} periods saw RPT growth outpace revenue.`

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      {/* === 1. HERO === */}
      <section
        className={`relative overflow-hidden rounded-3xl border ${chrome.border} ${chrome.bg} p-6 md:p-7 shadow-card animate-fadeUp`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: chrome.aurora }} />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${chrome.chip}`} />
                Governance signal
              </span>
              <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                <SignalIcon className="h-3 w-3" />
                {summary.signal}
              </span>
              <DataBadge state="mock" hint="Governance signal derived from mock RPT trend — annual report PDF parsing planned" />
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
              <span className={chrome.text}>Governance is {summary.signal.toLowerCase()}</span>
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-700">{summary.oneLiner}</p>
          </div>
          <div className="grid gap-3">
            <SummaryRow tone="positive" icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Main positive" text={summary.mainPositive} />
            <SummaryRow tone="negative" icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Main concern" text={summary.mainConcern} />
          </div>
        </div>
      </section>

      {/* === 2. RPT vs REVENUE TREND === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>RPT vs Revenue trend</span>
        <DataBadge state="mock" hint="RPT data lives in annual reports — PDF extraction via Claude API is Phase 4" />
      </div>
      <RPTTrendChart trend={trend} annotation={trendAnnotation} />

      {/* === 3. SIGNAL CARDS === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>Signal cards</span>
        <DataBadge state="mock" />
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-fadeUp">
        {summary.cards.map((card) => {
          const Icon = CARD_ICON[card.key]
          const tone = TONE[card.tone]
          return (
            <div
              key={card.key}
              className="group relative flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
            >
              <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${tone.strip}`} />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${tone.strip} text-white shadow-soft`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{card.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-300" />
              </div>
              <div className={`mt-3 text-[18px] font-bold ${tone.text}`}>{card.value}</div>
              <div className="mt-1 flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                <span className="text-[13px] font-medium leading-snug text-ink-700">{card.read}</span>
              </div>
            </div>
          )
        })}
      </section>

      {/* === 4. RELATED PARTY TABLE === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>Top related parties</span>
        <DataBadge state="mock" />
      </div>
      <RelatedPartyTable parties={parties} />

      {/* === 5. RPT FLOW VISUAL === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>RPT flow visual</span>
        <DataBadge state="mock" />
      </div>
      <RPTFlowVisual flows={flows} companyName={companyName} />

      {/* === 6. GOVERNANCE TREND STRIP === */}
      <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Governance trend strip
              </div>
              <DataBadge state="mock" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900">Direction of travel on each marker</h3>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.strip.map((item) => {
            const Icon = STRIP_ICON[item.key]
            const tone =
              item.direction === 'Improving'
                ? { bar: 'bg-emerald-500', label: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-200', icon: TrendingUp }
                : item.direction === 'Worsening'
                ? { bar: 'bg-rose-500', label: 'text-rose-700', bg: 'bg-rose-50/60', border: 'border-rose-200', icon: TrendingDown }
                : { bar: 'bg-sky-500', label: 'text-sky-700', bg: 'bg-sky-50/60', border: 'border-sky-200', icon: TrendingUp }
            const TrendIcon = tone.icon
            return (
              <div key={item.key} className={`relative overflow-hidden rounded-2xl border ${tone.border} ${tone.bg} p-4`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl ${tone.bar} text-white`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${tone.label}`}>
                      {item.label}
                    </div>
                    <div className="text-[13px] font-semibold text-ink-900">{item.direction}</div>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-ink-600">
                    <TrendIcon className="h-3 w-3" />
                    {item.direction}
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-snug text-ink-700">{item.read}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* === 7. FINAL READ === */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6 md:p-8 shadow-card animate-fadeUp">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(244,63,94,0.16), transparent)' }}
        />
        <div className="relative flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-glow">
            <Quote className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                Final governance read
              </div>
              <DataBadge state="mock" />
            </div>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-800">{summary.finalRead}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`pill border ${chrome.border} bg-white ${chrome.text}`}>
                Signal · {summary.signal}
              </span>
              <span className="pill border border-ink-200 bg-white text-ink-700">
                {parties.length} related parties tracked
              </span>
              <span className="pill border border-ink-200 bg-white text-ink-700">
                {trend.length} periods reviewed
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ===== sub-components ===== */

function SummaryRow({
  tone,
  icon,
  label,
  text,
}: {
  tone: 'positive' | 'negative'
  icon: React.ReactNode
  label: string
  text: string
}) {
  const styles =
    tone === 'positive'
      ? { border: 'border-emerald-200', bg: 'bg-emerald-50/70', icon: 'bg-emerald-500', label: 'text-emerald-700' }
      : { border: 'border-rose-200', bg: 'bg-rose-50/70', icon: 'bg-rose-500', label: 'text-rose-700' }
  return (
    <div className={`rounded-2xl border ${styles.border} ${styles.bg} p-4`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${styles.icon} text-white`}>{icon}</span>
        <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${styles.label}`}>{label}</span>
      </div>
      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-ink-900">{text}</p>
    </div>
  )
}
