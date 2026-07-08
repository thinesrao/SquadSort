import type { PointerEvent as ReactPointerEvent } from 'react'
import { CircleDollarSign, Repeat } from 'lucide-react'
import type { Team } from '../types'

interface TeamCardProps {
  team: Team
  /** Drag support (Teams view). */
  onPlayerPointerDown?: (e: ReactPointerEvent, teamId: number, index: number, name: string) => void
  activeKey?: string | null // "teamId:index" currently being dragged
  isOver?: boolean // this column is the current drop target
  /** Payment tracking (Teams view). */
  isPaid?: (name: string) => boolean
  onTogglePaid?: (name: string) => void
}

/** Compact team column for the multi-up grid on the Teams view. */
export function TeamCard({
  team,
  onPlayerPointerDown,
  activeKey,
  isOver,
  isPaid,
  onTogglePaid,
}: TeamCardProps) {
  const { color, players } = team
  const draggable = !!onPlayerPointerDown
  const starters = team.starters ?? players.length

  return (
    <div
      data-team-col={team.id}
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-zinc-900 ring-1 transition ${
        isOver ? 'ring-2 ring-emerald-400' : color.ring
      }`}
    >
      <div
        className={`flex items-center justify-between gap-1 px-2 py-1.5 ${color.headerBg} ${color.headerText}`}
      >
        <span className="flex min-w-0 items-center gap-1 text-xs font-bold">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.swatch}`} aria-hidden />
          <span className="truncate">{color.name}</span>
        </span>
        <span className="shrink-0 text-xs font-bold tabular-nums opacity-80">
          {players.length}
        </span>
      </div>
      <ol className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-1.5">
        {players.map((name, i) => {
          const key = `${team.id}:${i}`
          const isDragging = activeKey === key
          const paid = isPaid?.(name) ?? false
          const isSub = i >= starters
          const subNo = i - starters + 1
          return (
            <div key={`${name}-${i}`}>
              {i === starters && starters < players.length && (
                <div className="my-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400/80">
                  <Repeat className="h-3 w-3" />
                  Subs
                  <span className="h-px flex-1 bg-zinc-800" />
                </div>
              )}
              <li
                data-player-key={key}
                onPointerDown={
                  draggable ? (e) => onPlayerPointerDown?.(e, team.id, i, name) : undefined
                }
                onContextMenu={draggable ? (e) => e.preventDefault() : undefined}
                className={`flex items-center gap-1 rounded text-sm leading-tight ${
                  draggable ? 'cursor-grab touch-none select-none py-0.5 active:cursor-grabbing' : ''
                } ${isDragging ? 'opacity-30' : ''} ${isSub ? 'text-zinc-400' : ''}`}
              >
                <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-zinc-500">
                  {isSub ? `S${subNo}` : i + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${isSub ? 'text-zinc-400' : 'text-zinc-100'}`}
                >
                  {name}
                </span>
                {onTogglePaid && (
                  <button
                    type="button"
                    aria-label={`${name} ${paid ? 'paid' : 'unpaid'}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onTogglePaid(name)}
                    className="shrink-0 p-0.5 active:scale-90"
                  >
                    <CircleDollarSign
                      className={`h-4 w-4 ${paid ? 'text-emerald-400' : 'text-zinc-600'}`}
                      strokeWidth={2.25}
                    />
                  </button>
                )}
              </li>
            </div>
          )
        })}
      </ol>
    </div>
  )
}
