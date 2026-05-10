import { useEffect, useState } from 'react'
import { Check, Loader2, TrendingUp, Sparkles } from 'lucide-react'
import type { Company } from '../types'

interface Props {
  company: Company
  onDone: () => void
}

const STEPS = [
  { label: 'Pulling shareholding pattern', detail: '20 quarters · BSE/NSE filings' },
  { label: 'Ranking institutional holders', detail: 'FII · DII · MF · Insurance' },
  { label: 'Scanning insider & bulk deals', detail: 'SEBI insider trade window' },
  { label: 'Reading governance markers', detail: 'RPT · pledge · auditor' },
  { label: 'Composing buy-side read', detail: 'Signal · trend · note' },
]

export default function LoadingProgress({ company, onDone }: Props) {
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const total = 2800 // ms
    const tick = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / total)
      const eased = 1 - Math.pow(1 - t, 2.4)
      setProgress(eased * 100)
      const idx = Math.min(STEPS.length - 1, Math.floor(eased * STEPS.length))
      setStepIndex(idx)
      if (t >= 1) {
        clearInterval(tick)
        setTimeout(onDone, 280)
      }
    }, 60)
    return () => clearInterval(tick)
  }, [onDone])

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* lush green gradient bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(at 20% 20%, rgba(16,185,129,0.25) 0px, transparent 60%), radial-gradient(at 80% 0%, rgba(20,184,166,0.22) 0px, transparent 55%), radial-gradient(at 50% 100%, rgba(34,197,94,0.18) 0px, transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.18) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage:
            'radial-gradient(ellipse at center, black 35%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12">
        {/* halo logo */}
        <div className="relative mb-8 animate-floatY">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-emerald-500/30 blur-2xl" />
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-glow">
            <TrendingUp className="h-8 w-8 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 max-w-xl text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-emerald-800 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Generating ownership signal
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 md:text-4xl">
            Reading the holders of {company.name}
          </h1>
          <p className="mt-2 text-sm text-emerald-900/70">
            Synthesizing 20 quarters of ownership and governance into one investor-grade read.
          </p>
        </div>

        {/* Progress card */}
        <div className="w-full max-w-xl rounded-2xl border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur">
          <div className="mb-4 flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-emerald-700">
                {Math.round(progress)}
              </span>
              <span className="text-sm font-semibold text-emerald-700/70">%</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800/80">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {STEPS[stepIndex].label}
            </div>
          </div>
          {/* Bar */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 w-32 animate-shimmer"
              style={{
                left: 0,
                backgroundImage:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>

          {/* Steps */}
          <div className="mt-5 space-y-2">
            {STEPS.map((s, i) => {
              const done = i < stepIndex
              const active = i === stepIndex
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
                    done
                      ? 'text-emerald-700'
                      : active
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-emerald-900/40'
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : active
                        ? 'border-emerald-400 bg-white text-emerald-600'
                        : 'border-emerald-200 bg-white text-emerald-300'
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${done || active ? '' : 'text-emerald-900/40'}`}>
                      {s.label}
                    </div>
                    <div className="text-[11px] opacity-70">{s.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-emerald-900/50">
          {company.ticker} · {company.exchange} · {company.country}
        </div>
      </div>
    </div>
  )
}
