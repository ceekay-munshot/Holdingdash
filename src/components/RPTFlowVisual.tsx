import {
  ArrowRight,
  Banknote,
  Building2,
  Coins,
  Flame,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { RPTFlowEntry } from '../types'

interface Props {
  flows: RPTFlowEntry[]
  companyName: string
}

const FLAVOR_META: Record<
  RPTFlowEntry['flavor'],
  { label: string; gradient: string; icon: LucideIcon; suffix?: string }
> = {
  largest_txn: { label: 'Largest transaction', gradient: 'from-rose-500 to-pink-600', icon: Flame },
  largest_balance: { label: 'Largest outstanding balance', gradient: 'from-violet-500 to-indigo-600', icon: Wallet },
  fastest_growing: { label: 'Fastest-growing counterparty', gradient: 'from-amber-500 to-orange-500', icon: TrendingUp },
}

const TXN_ICON: Record<string, LucideIcon> = {
  'Goods Sale': Coins,
  'Goods Purchase': Coins,
  'Service Income': Banknote,
  'Service Expense': Banknote,
  'Loan Given': Banknote,
  'Loan Taken': Banknote,
  Investment: Banknote,
  Royalty: Coins,
  Lease: Building2,
}

export default function RPTFlowVisual({ flows, companyName }: Props) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card animate-fadeUp">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            RPT flow visual
          </div>
          <h3 className="text-lg font-semibold text-ink-900">
            Where the money flows — in plain sight
          </h3>
        </div>
        <span className="hidden text-[11px] text-ink-400 md:inline">
          From {companyName} → counterparty → transaction
        </span>
      </div>

      <div className="grid gap-3">
        {flows.map((f) => {
          const meta = FLAVOR_META[f.flavor]
          const TxnIcon = TXN_ICON[f.transactionType] ?? Coins
          return (
            <div
              key={f.flavor}
              className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-4 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${meta.gradient}`} />
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-soft`}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    {meta.label}
                  </span>
                </div>
                <span className="text-[11px] text-ink-500">{f.caption}</span>
              </div>

              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                <FlowNode label="Company" sub={companyName} accent="from-ink-700 to-ink-900" />
                <Connector />
                <FlowNode
                  label={f.relationship}
                  sub={f.counterparty}
                  accent={meta.gradient}
                  highlight
                />
                <Connector />
                <FlowNode
                  label={f.transactionType}
                  sub={`₹${f.value.toLocaleString('en-IN')} Cr`}
                  accent="from-emerald-500 to-teal-600"
                  icon={TxnIcon}
                  align="end"
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Connector() {
  return (
    <div className="flex items-center justify-center md:px-1">
      <ArrowRight className="hidden h-4 w-4 text-ink-300 md:block" />
      <div className="block text-ink-300 md:hidden">
        <ArrowRight className="h-4 w-4 rotate-90" />
      </div>
    </div>
  )
}

function FlowNode({
  label,
  sub,
  accent,
  highlight,
  icon: Icon,
  align = 'start',
}: {
  label: string
  sub: string
  accent: string
  highlight?: boolean
  icon?: LucideIcon
  align?: 'start' | 'end'
}) {
  return (
    <div
      className={`flex flex-1 items-start gap-2.5 rounded-xl border p-3 ${
        highlight ? 'border-ink-200 bg-ink-50/40' : 'border-ink-100 bg-white'
      } ${align === 'end' ? 'md:text-right' : ''}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-soft`}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
      </span>
      <div className={`min-w-0 ${align === 'end' ? 'md:ml-auto' : ''}`}>
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-500">
          {label}
        </div>
        <div className="truncate text-[13px] font-semibold text-ink-900">{sub}</div>
      </div>
    </div>
  )
}
