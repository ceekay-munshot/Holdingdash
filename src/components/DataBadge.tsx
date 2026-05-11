import { CircleDashed, Wifi } from 'lucide-react'

export type DataState = 'live' | 'mock' | 'mixed'

interface Props {
  state: DataState
  /** Optional tooltip / longer explanation shown via title attribute */
  hint?: string
  size?: 'sm' | 'md'
}

const STYLES = {
  live: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'LIVE',
    icon: Wifi,
  },
  mock: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'MOCK',
    icon: CircleDashed,
  },
  mixed: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    label: 'MIXED',
    icon: Wifi,
  },
} as const

/**
 * Small pill that visibly tags a section as LIVE (real ingested data) or
 * MOCK (deterministic seeded stand-in) — added during the live-data buildout
 * so users always know what they're looking at.
 */
export default function DataBadge({ state, hint, size = 'sm' }: Props) {
  const s = STYLES[state]
  const Icon = s.icon
  const sizing =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[9.5px] gap-1'
      : 'px-2 py-0.5 text-[10.5px] gap-1.5'
  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'
  return (
    <span
      className={`inline-flex items-center rounded-full border font-bold uppercase tracking-wider ${s.bg} ${s.text} ${s.border} ${sizing}`}
      title={hint || (state === 'live' ? 'Real data from ingestion pipeline' : state === 'mock' ? 'Deterministic seeded sample data — coming live soon' : 'Mix of live + mock data')}
    >
      <Icon className={iconSize} />
      {s.label}
    </span>
  )
}
