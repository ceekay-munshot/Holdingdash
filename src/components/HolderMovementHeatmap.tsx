import { useState } from 'react'
import { Info } from 'lucide-react'
import type { HeatmapCell, HeatmapRow } from '../types'

interface Props {
  quarters: string[]
  rows: HeatmapRow[]
}

const STATE_STYLE: Record<HeatmapCell['state'], { bg: string; ring: string; text: string; label: string }> = {
  up: { bg: 'bg-emerald-500', ring: 'ring-emerald-300', text: 'text-white', label: 'Increase' },
  down: { bg: 'bg-rose-500', ring: 'ring-rose-300', text: 'text-white', label: 'Decrease' },
  stable: { bg: 'bg-ink-200', ring: 'ring-ink-300', text: 'text-ink-700', label: 'Stable' },
  watch: { bg: 'bg-amber-500', ring: 'ring-amber-300', text: 'text-white', label: 'Watch (reversal)' },
}

export default function HolderMovementHeatmap({ quarters, rows }: Props) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)

  // intensity scaling — find max absolute delta per row to normalise opacity
  const rowMax = rows.map((r) =>
    Math.max(0.18, ...r.cells.map((c) => Math.abs(c.delta))),
  )

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 md:p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Holder movement · last 8 quarters
          </div>
          <h3 className="text-lg font-semibold text-ink-900">Where is ownership pressure coming from?</h3>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* header row */}
          <div className="grid items-center gap-2" style={gridCols(quarters.length)}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Bucket
            </div>
            {quarters.map((q) => (
              <div key={q} className="text-center text-[10px] font-semibold tracking-wide text-ink-400">
                {q}
              </div>
            ))}
          </div>

          {/* rows */}
          <div className="mt-2 space-y-2">
            {rows.map((row, rIdx) => (
              <div key={row.bucket} className="grid items-center gap-2" style={gridCols(quarters.length)}>
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${bucketDot(row.bucket)}`} />
                  <span className="truncate text-[12.5px] font-semibold text-ink-800">
                    {row.bucket}
                  </span>
                </div>
                {row.cells.map((cell, cIdx) => {
                  const style = STATE_STYLE[cell.state]
                  const intensity =
                    cell.state === 'stable'
                      ? 0.6
                      : Math.min(1, 0.45 + Math.abs(cell.delta) / rowMax[rIdx])
                  const active = hover && hover.r === rIdx && hover.c === cIdx
                  return (
                    <button
                      type="button"
                      key={cIdx}
                      onMouseEnter={() => setHover({ r: rIdx, c: cIdx })}
                      onMouseLeave={() => setHover(null)}
                      className={`group relative flex h-10 items-center justify-center rounded-lg ${style.bg} ${style.text} text-[11px] font-bold transition-all ${
                        active ? `scale-[1.08] ring-2 ${style.ring} shadow-card` : ''
                      }`}
                      style={{ opacity: intensity }}
                    >
                      <span className="tabular-nums">
                        {cell.delta > 0 ? '+' : ''}
                        {cell.delta.toFixed(2)}
                      </span>
                      {active && (
                        <div className="pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-[11px] text-ink-700 shadow-card">
                          <div className="font-semibold text-ink-900">
                            {row.bucket} · {quarters[cIdx]}
                          </div>
                          <div className="mt-0.5 text-ink-500">
                            {style.label} · {cell.delta > 0 ? '+' : ''}
                            {cell.delta.toFixed(2)}pp QoQ
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50/60 px-4 py-3 text-[12.5px] text-ink-700">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" />
        <span>
          Cells show QoQ pp change. Intensity scales with the size of the move. Amber cells flag a
          reversal vs the prior trend — worth a second look.
        </span>
      </div>
    </div>
  )
}

function gridCols(n: number): React.CSSProperties {
  return { gridTemplateColumns: `170px repeat(${n}, minmax(0, 1fr))` }
}

function bucketDot(bucket: string) {
  switch (bucket) {
    case 'Promoter':
      return 'bg-sky-500'
    case 'FII':
      return 'bg-indigo-500'
    case 'DII':
      return 'bg-emerald-500'
    case 'Public':
      return 'bg-amber-500'
    default:
      return 'bg-rose-500'
  }
}

function Legend() {
  const items: { state: HeatmapCell['state']; label: string }[] = [
    { state: 'up', label: 'Increase' },
    { state: 'down', label: 'Decrease' },
    { state: 'stable', label: 'Stable' },
    { state: 'watch', label: 'Watch' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span
          key={it.state}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink-600"
        >
          <span className={`h-2 w-2 rounded-sm ${STATE_STYLE[it.state].bg}`} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
