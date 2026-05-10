import { TrendingUp, ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react'
import type { Company } from '../types'

interface Props {
  company: Company
  onBack: () => void
  onExportExcel: () => void
  onExportPdf: () => void
}

export default function DashboardHeader({ company, onBack, onExportExcel, onExportPdf }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
        {/* left - brand + company */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
            aria-label="Back to selector"
            title="Back to company selector"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2.5 border-l border-ink-100 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-glow">
              <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                HoldingDash
              </div>
              <div className="text-xs text-ink-400">Ownership Signal</div>
            </div>
          </div>

          <div className="ml-2 hidden h-9 border-l border-ink-100 md:block" />

          <div className="hidden md:flex md:items-baseline md:gap-2.5">
            <span className="text-base font-semibold text-ink-900">{company.name}</span>
            <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[11px] text-ink-600">
              {company.ticker}
            </span>
            <span className="text-[11px] text-ink-400">
              {company.exchange} · {company.country}
            </span>
          </div>
        </div>

        {/* right - exports */}
        <div className="flex items-center gap-2">
          <button onClick={onExportExcel} className="btn-ghost">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Excel
          </button>
          <button onClick={onExportPdf} className="btn-ghost">
            <FileText className="h-3.5 w-3.5 text-rose-600" />
            Export PDF
          </button>
        </div>
      </div>

      {/* mobile company line */}
      <div className="mx-auto flex max-w-7xl items-baseline gap-2 px-6 pb-2 md:hidden">
        <span className="text-sm font-semibold text-ink-900">{company.name}</span>
        <span className="rounded-md bg-ink-100 px-2 py-0.5 font-mono text-[10px] text-ink-600">
          {company.ticker}
        </span>
      </div>
    </header>
  )
}
