import type { Team } from '../types'

interface TeamCardProps {
  team: Team
}

/** Compact team column for the multi-up grid on the Teams view. */
export function TeamCard({ team }: TeamCardProps) {
  const { color, players } = team
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-zinc-900 ring-1 ${color.ring}`}>
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
        {players.map((name, i) => (
          <li key={`${name}-${i}`} className="flex items-baseline gap-1 text-sm leading-tight">
            <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-zinc-500">
              {i + 1}
            </span>
            <span className="truncate text-zinc-100">{name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
