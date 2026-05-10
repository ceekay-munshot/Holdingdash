import { ArrowLeft, Sparkles, type LucideIcon } from 'lucide-react'
import type { TabKey } from '../types'

interface Props {
  tab: Exclude<TabKey, 'overview'>
  icon: LucideIcon
  onBackToOverview: () => void
}

const META: Record<
  Exclude<TabKey, 'overview'>,
  { title: string; subtitle: string; gradient: string; bullets: string[] }
> = {
  trends: {
    title: 'Ownership Trends',
    subtitle: 'Deep dive into Promoter, FII, DII and Public movement.',
    gradient: 'from-indigo-500 to-violet-600',
    bullets: [
      'Quarter-on-quarter ownership composition',
      'Top 25 institutional holders with movement',
      'New entries and exits with cumulative breadth',
      'Concentration index and holding-period heatmap',
    ],
  },
  insider: {
    title: 'Insider & Deals',
    subtitle: 'Insider trades, bulk and block deals — clustered into signal.',
    gradient: 'from-amber-500 to-orange-600',
    bullets: [
      'Insider trade ladder by promoter and KMP',
      'Cluster detection across rolling windows',
      'Bulk and block deal flow with counterparties',
      'Sell-to-grant ratio and routine vs unusual flag',
    ],
  },
  governance: {
    title: 'Governance Risk',
    subtitle: 'RPT, pledges, auditor changes and board independence.',
    gradient: 'from-rose-500 to-pink-600',
    bullets: [
      'Related-party transactions vs revenue trend',
      'Pledge movement with promoter-wise split',
      'Auditor and board independence scorecard',
      'Composite governance score with peer band',
    ],
  },
}

export default function PlaceholderTab({ tab, icon: Icon, onBackToOverview }: Props) {
  const meta = META[tab]
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="relative overflow-hidden rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        {/* mesh aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 opacity-90"
          style={{
            background:
              tab === 'trends'
                ? 'radial-gradient(at 12% 8%, rgba(99,102,241,0.18), transparent 55%), radial-gradient(at 88% 0%, rgba(139,92,246,0.18), transparent 55%)'
                : tab === 'insider'
                ? 'radial-gradient(at 12% 8%, rgba(245,158,11,0.18), transparent 55%), radial-gradient(at 88% 0%, rgba(249,115,22,0.18), transparent 55%)'
                : 'radial-gradient(at 12% 8%, rgba(244,63,94,0.18), transparent 55%), radial-gradient(at 88% 0%, rgba(236,72,153,0.16), transparent 55%)',
          }}
        />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-semibold text-ink-700 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              In build · Coming next
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 md:text-4xl">
              {meta.title}
            </h2>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-600">
              {meta.subtitle}
            </p>

            <ul className="mt-5 space-y-2">
              {meta.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13.5px] text-ink-700">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r ${meta.gradient}`} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <button onClick={onBackToOverview} className="btn-ghost mt-6">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Overview
            </button>
          </div>

          {/* visual mockup */}
          <div className="relative h-72 overflow-hidden rounded-2xl border border-white/70 bg-white/60 shadow-soft backdrop-blur">
            <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${meta.gradient}`} />
            <div className="grid h-full grid-rows-[auto_1fr] gap-3 p-5">
              <div className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-white shadow-soft`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                    Preview
                  </div>
                  <div className="text-sm font-semibold text-ink-900">{meta.title} module</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-ink-100 bg-white/70 p-3"
                  >
                    <div className="h-2 w-10 rounded bg-ink-100" />
                    <div className="mt-2 h-3 w-14 rounded bg-ink-200" />
                    <div className="mt-3 flex gap-0.5">
                      {[6, 10, 8, 14, 11, 16, 13].map((h, j) => (
                        <div
                          key={j}
                          className={`flex-1 rounded-sm bg-gradient-to-t ${meta.gradient} opacity-${30 + (j * 8 % 60)}`}
                          style={{ height: h, opacity: 0.35 + j * 0.07 }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
