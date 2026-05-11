import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flame,
  Quote,
  TrendingDown,
  TrendingUp,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react'
import type {
  BulkBlockDeal,
  InsiderDealsData,
  InsiderHorizon,
  InsiderSignal,
  InsiderSignalCard,
  PricePoint,
} from '../types'
import InsiderTimelineChart from './InsiderTimelineChart'
import InsiderTransactionTable from './InsiderTransactionTable'
import BulkDealsSection from './BulkDealsSection'
import DataBadge from './DataBadge'
import type { LiveDealsBundle, LivePriceHistory } from '../lib/liveData'

interface Props {
  data: InsiderDealsData
  livePrices?: LivePriceHistory | null
  liveDeals?: LiveDealsBundle | null
}

const SIGNAL_CHROME: Record<
  InsiderSignal,
  { bg: string; chip: string; text: string; border: string; aurora: string; icon: typeof TrendingUp }
> = {
  Positive: {
    bg: 'bg-hero-positive',
    chip: 'bg-emerald-500',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(16,185,129,0.20), transparent 55%), radial-gradient(at 92% 0%, rgba(20,184,166,0.18), transparent 55%)',
    icon: TrendingUp,
  },
  Neutral: {
    bg: 'bg-hero-positive',
    chip: 'bg-sky-500',
    text: 'text-sky-700',
    border: 'border-sky-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(14,165,233,0.18), transparent 55%), radial-gradient(at 92% 0%, rgba(99,102,241,0.16), transparent 55%)',
    icon: Eye,
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
  Risky: {
    bg: 'bg-hero-risky',
    chip: 'bg-rose-500',
    text: 'text-rose-700',
    border: 'border-rose-200',
    aurora:
      'radial-gradient(at 8% 0%, rgba(244,63,94,0.22), transparent 55%), radial-gradient(at 92% 0%, rgba(239,68,68,0.18), transparent 55%)',
    icon: TrendingDown,
  },
}

const CARD_ICON: Record<InsiderSignalCard['key'], typeof TrendingUp> = {
  net: TrendingUp,
  buyIntensity: Flame,
  sellPattern: TrendingDown,
  silence: VolumeX,
}

const CARD_TONE = {
  positive: { strip: 'from-emerald-500 to-teal-600', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  neutral: { strip: 'from-sky-500 to-indigo-500', text: 'text-sky-700', dot: 'bg-sky-500' },
  watch: { strip: 'from-amber-500 to-orange-500', text: 'text-amber-700', dot: 'bg-amber-500' },
  risky: { strip: 'from-rose-500 to-pink-600', text: 'text-rose-700', dot: 'bg-rose-500' },
} as const

const HORIZONS: InsiderHorizon[] = ['1Y', '2Y', '5Y', '10Y', 'Max']

export default function InsiderDealsTab({ data, livePrices, liveDeals }: Props) {
  const { summary, pricePoints, trades, deals, dealsRead } = data
  const [horizon, setHorizon] = useState<InsiderHorizon>('5Y')
  const [activeCard, setActiveCard] = useState<InsiderSignalCard | null>(null)
  const chrome = SIGNAL_CHROME[summary.signal]
  const SignalIcon = chrome.icon

  // Prefer live prices when we have them, fall back to mock
  const effectivePrices: PricePoint[] = useMemo(() => {
    if (livePrices && livePrices.rows.length >= 20) {
      return livePrices.rows.map((r) => ({ date: r.date, price: r.close }))
    }
    return pricePoints
  }, [livePrices, pricePoints])

  const liveDealsCount =
    (liveDeals?.bulk?.rows?.length ?? 0) + (liveDeals?.block?.rows?.length ?? 0)
  // Live infrastructure is detected via live prices — if prices flow for this
  // ticker, the daily deals workflow is also active. When prices flow but no
  // deals exist for this ticker, that's a real "no recent activity" signal,
  // not a missing pipeline.
  const liveInfrastructureActive = !!livePrices && livePrices.rows.length > 0
  const usingLiveDeals = liveDealsCount > 0
  const liveDealsEmpty = liveInfrastructureActive && !usingLiveDeals
  const effectiveDeals: BulkBlockDeal[] = useMemo(() => {
    // When live infrastructure is up but this ticker had no reportable deals,
    // show an empty list (the UI explains why) rather than misleading mock rows.
    if (liveDealsEmpty) return []
    if (!liveDeals || liveDealsCount === 0) return deals
    const merged: BulkBlockDeal[] = []
    for (const r of liveDeals.bulk.rows) {
      merged.push({
        date: r.date ?? '',
        buyer: r.buySell === 'BUY' ? r.clientName : 'Open Market',
        seller: r.buySell === 'SELL' ? r.clientName : 'Open Market',
        dealType: 'Bulk',
        value: r.value,
        premiumPct: 0,
        signal: classifyDealSignal(r.clientName, r.buySell, r.value),
      })
    }
    for (const r of liveDeals.block.rows) {
      merged.push({
        date: r.date ?? '',
        buyer: r.buySell === 'BUY' ? r.clientName : 'Open Market',
        seller: r.buySell === 'SELL' ? r.clientName : 'Open Market',
        dealType: 'Block',
        value: r.value,
        premiumPct: 0,
        signal: classifyDealSignal(r.clientName, r.buySell, r.value),
      })
    }
    merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    return merged.slice(0, 12)
  }, [liveDeals, liveDealsCount, liveDealsEmpty, deals])

  const usingLivePrices = livePrices && livePrices.rows.length >= 20
  const effectiveDealsRead = usingLiveDeals
    ? `Live · ${liveDealsCount} bulk / block deals over the last 7 trading days from NSE archives.`
    : liveDealsEmpty
    ? 'Live · NSE bulk + block deal pipeline is active for this ticker. No reportable bulk/block deal in the last 7 trading days — typical for large caps where 0.5% bulk threshold rarely trips.'
    : dealsRead

  // annotation tied to horizon
  const baseAnnotation =
    horizon === '1Y'
      ? 'Last 12 months: ' + summary.oneLiner
      : horizon === '10Y' || horizon === 'Max'
      ? 'Long view shows insider activity through multiple cycles. Look for buy clusters near drawdowns and sell clusters near peaks.'
      : 'Mid-horizon view balances near-term clusters with longer-term pattern.'
  const annotation = usingLivePrices
    ? `${baseAnnotation} Price line is live from NSE bhavcopy.`
    : baseAnnotation

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      {/* === 1. INSIDER SIGNAL HERO === */}
      <section
        className={`relative overflow-hidden rounded-3xl border ${chrome.border} ${chrome.bg} p-6 md:p-7 shadow-card animate-fadeUp`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: chrome.aurora }} />
        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${chrome.chip}`} />
                Insider signal
              </span>
              <span className={`pill border ${chrome.border} bg-white/70 ${chrome.text}`}>
                <SignalIcon className="h-3 w-3" />
                {summary.signal}
              </span>
              <DataBadge state="mock" hint="Signal derived from mock insider trades — NSE blocks GitHub IPs" />
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
              <span className={chrome.text}>Insider activity is {summary.signal.toLowerCase()}</span>
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-700">{summary.oneLiner}</p>
          </div>

          <div className="grid gap-3">
            <SummaryRow
              tone="positive"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Main positive"
              text={summary.mainPositive}
            />
            <SummaryRow
              tone="negative"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              label="Main concern"
              text={summary.mainConcern}
            />
          </div>
        </div>
      </section>

      {/* === 2. TIMELINE SWITCH + 3. CHART === */}
      <section className="space-y-3 animate-fadeUp">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Timeline horizon
              </div>
              <DataBadge
                state={usingLivePrices ? 'mixed' : 'mock'}
                hint={
                  usingLivePrices
                    ? 'Price line is LIVE from NSE bhavcopy. Buy/sell bars are MOCK.'
                    : 'Both price and insider bars are mock. Live prices appear once bhavcopy ingestion runs for this ticker.'
                }
              />
            </div>
            <div className="text-sm text-ink-500">
              Insider buys and sells overlaid on price.
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-ink-100/70 p-1">
            {HORIZONS.map((h) => {
              const active = h === horizon
              return (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`rounded-xl px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    active ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  {h}
                </button>
              )
            })}
          </div>
        </div>

        <InsiderTimelineChart
          horizon={horizon}
          pricePoints={effectivePrices}
          trades={trades}
          annotation={annotation}
        />
        {usingLivePrices && (
          <div className="flex items-center justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700">
              <Wifi className="h-3 w-3" />
              Live · NSE bhavcopy ({livePrices!.rows.length} rows)
            </span>
          </div>
        )}
      </section>

      {/* === 4. SIGNAL CARDS === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>Signal cards</span>
        <DataBadge state="mock" />
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-fadeUp">
        {summary.cards.map((card) => {
          const Icon = CARD_ICON[card.key]
          const tone = CARD_TONE[card.tone]
          return (
            <button
              key={card.key}
              onClick={() => setActiveCard(card)}
              className={`group relative flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-5 text-left shadow-soft ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-card`}
            >
              <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl bg-gradient-to-r ${tone.strip}`} />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${tone.strip} text-white shadow-soft`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    {card.label}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-600" />
              </div>
              <div className={`mt-3 text-[18px] font-bold ${tone.text}`}>{card.value}</div>
              <div className="mt-1 flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                <span className="text-[13px] font-medium leading-snug text-ink-700">{card.read}</span>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-ink-400 group-hover:text-emerald-600">
                Click for context →
              </div>
            </button>
          )
        })}
      </section>

      {/* === 5. TRANSACTIONS TABLE === */}
      <section className="animate-fadeUp">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          <span>Insider transactions</span>
          <DataBadge state="mock" hint="NSE corporates-pit API blocks GitHub IPs — mock for now" />
        </div>
        <InsiderTransactionTable trades={trades} />
      </section>

      {/* === 6. BULK / BLOCK DEALS === */}
      <div className="-mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <span>Bulk & block deals</span>
        <DataBadge
          state={usingLiveDeals || liveDealsEmpty ? 'live' : 'mock'}
          hint={
            usingLiveDeals
              ? 'Live from NSE archives — last 7 trading days, refreshed daily'
              : liveDealsEmpty
              ? 'Live NSE pipeline active for this ticker. No reportable bulk/block deal in last 7 trading days.'
              : 'Live deals not yet ingested for this ticker'
          }
        />
      </div>
      <BulkDealsSection
        deals={effectiveDeals}
        read={effectiveDealsRead}
        live={usingLiveDeals || liveDealsEmpty}
      />

      {/* === 7. FINAL READ === */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-100 bg-gradient-to-br from-ink-50 to-white p-6 md:p-8 shadow-card animate-fadeUp">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(245,158,11,0.16), transparent)' }}
        />
        <div className="relative flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-glow">
            <Quote className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Final insider & deals read
              </div>
              <DataBadge state="mixed" hint="Narrative combines mock insider signal with live bulk/block context" />
            </div>
            <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-ink-800">
              {summary.finalRead}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`pill border ${chrome.border} bg-white ${chrome.text}`}>
                Signal · {summary.signal}
              </span>
              <span className="pill border border-ink-200 bg-white text-ink-700">
                {trades.length} insider transactions
              </span>
              <span className="pill border border-ink-200 bg-white text-ink-700">
                {deals.length} bulk / block deals
              </span>
            </div>
          </div>
        </div>
      </section>

      {activeCard && (
        <CardDetailDrawer card={activeCard} onClose={() => setActiveCard(null)} />
      )}
    </div>
  )
}

/* ===== helpers ===== */

function classifyDealSignal(
  clientName: string,
  buySell: string,
  valueCr: number,
): BulkBlockDeal['signal'] {
  const lower = clientName.toLowerCase()
  const institutional = /mutual|insurance|investments|capital|life|pension|holdings|asset|fund/i.test(lower)
  const isBuy = buySell === 'BUY'
  if (institutional && isBuy && valueCr >= 25) return 'Institutional Accumulation'
  if (institutional && !isBuy && valueCr >= 25) return 'Large Exit'
  if (valueCr >= 50) return 'Churn'
  if (valueCr >= 10) return 'Neutral'
  return 'Neutral'
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
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${styles.icon} text-white`}>
          {icon}
        </span>
        <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${styles.label}`}>
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-[14px] font-semibold leading-snug text-ink-900">{text}</p>
    </div>
  )
}

function CardDetailDrawer({ card, onClose }: { card: InsiderSignalCard; onClose: () => void }) {
  const tone = CARD_TONE[card.tone]
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[460px] animate-slideIn flex-col bg-white shadow-[-32px_0_60px_-20px_rgba(20,26,42,0.18)]">
        <div className="border-b border-ink-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className={`pill border bg-white ${tone.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {card.label}
              </span>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-ink-900">{card.value}</h3>
              <p className="mt-1 text-sm text-ink-600">{card.read}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="drawer-scroll flex-1 overflow-y-auto px-6 py-5">
          <div className={`rounded-2xl border bg-white p-5 shadow-soft border-ink-100`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              How buy-side reads it
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-700">
              {readContext(card.key)}
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}

function readContext(key: InsiderSignalCard['key']): string {
  switch (key) {
    case 'net':
      return 'Net insider activity is the simplest summary. Persistent net selling without any net buying through drawdowns is a soft negative — it suggests insiders see no urgency to add. Net buying is rare in Indian markets and almost always meaningful.'
    case 'buyIntensity':
      return 'Buy intensity is the single highest-signal insider behavior. Insiders buy for fewer reasons than they sell. Open market purchases by founders or executives — especially during drawdowns — typically front-run improving fundamentals.'
    case 'sellPattern':
      return 'Sell pattern matters more than sell volume. Routine, well-spaced sells driven by ESOP exercise or diversification are noise. Time-clustered sells across multiple insiders within a tight window are a signal.'
    case 'silence':
      return 'Insider silence is informative. Long stretches of zero activity can mean confidence, indifference, or trading-window restrictions. Combined with poor performance, it tilts negative.'
  }
}
