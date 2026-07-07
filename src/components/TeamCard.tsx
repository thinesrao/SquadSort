import type { Team } from '../types'

interface TeamCardProps {
  team: Team
  targetSize: number
}

/** A colored team panel: solid header (color identity) + player list. */
export function TeamCard({ team, targetSize }: TeamCardProps) {
  const { color, players } = team
  const short = players.length < targetSize
  const over = players.length > targetSize

  return (
    <div className={`overflow-hidden rounded-2xl bg-zinc-900 ring-1 ${color.ring}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${color.headerBg} ${color.headerText}`}>
        <div className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden>{color.emoji}</span>
          <span>Team {color.name}</span>
        </div>
        <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-sm font-bold tabular-nums">
          {players.length}
        </span>
      </div>

      {players.length === 0 ? (
        <p className="px-4 py-4 text-sm text-zinc-500">No players assigned.</p>
      ) : (
        <ol className="divide-y divide-zinc-800">
          {players.map((name, i) => (
            <li key={`${name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 shrink-0 text-right text-sm font-medium tabular-nums text-zinc-500">
                {i + 1}
              </span>
              <span className="truncate text-base text-zinc-100">{name}</span>
            </li>
          ))}
        </ol>
      )}

      {(short || over) && (
        <p className="px-4 py-2 text-xs font-medium text-amber-400/90">
          {short
            ? `${targetSize - players.length} short of target — will borrow subs.`
            : `${players.length - targetSize} over target size.`}
        </p>
      )}
    </div>
  )
}
