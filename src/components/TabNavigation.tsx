import { LayoutDashboard, LineChart, ArrowLeftRight, ShieldAlert } from 'lucide-react'
import type { TabKey } from '../types'

interface Props {
  active: TabKey
  onChange: (tab: TabKey) => void
}

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard; accent: string }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard, accent: 'from-emerald-500 to-teal-600' },
  { key: 'trends', label: 'Ownership Trends', icon: LineChart, accent: 'from-indigo-500 to-violet-600' },
  { key: 'insider', label: 'Insider & Deals', icon: ArrowLeftRight, accent: 'from-amber-500 to-orange-600' },
  { key: 'governance', label: 'Governance Risk', icon: ShieldAlert, accent: 'from-rose-500 to-pink-600' },
]

export default function TabNavigation({ active, onChange }: Props) {
  return (
    <div className="border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-6 py-2">
        <div className="flex items-center gap-1.5 rounded-2xl bg-ink-100/70 p-1">
          {TABS.map((t) => {
            const isActive = active === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={`tab-btn ${isActive ? 'tab-btn-active' : ''}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${
                    isActive ? `bg-gradient-to-br text-white ${t.accent}` : 'text-ink-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="whitespace-nowrap">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
