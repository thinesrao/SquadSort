import { ArrowLeftRight } from 'lucide-react'
import type { Match, Team } from '../types'
import { borrowLabel, restingLabel } from '../lib/format'

interface MatchCardProps {
  match: Match
  teams: Team[]
}

function TeamTag({ team }: { team: Team }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold text-zinc-100">
      <span className={`h-2.5 w-2.5 rounded-full ${team.color.swatch}`} aria-hidden />
      {team.color.name}
    </span>
  )
}

/** Compact single-row match with an optional borrow sub-line. */
export function MatchCard({ match, teams }: MatchCardProps) {
  const rest = restingLabel(match, teams)
  const borrow = borrowLabel(match, teams)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-zinc-800 text-[11px] font-bold text-emerald-400">
          {match.index}
        </span>
        <TeamTag team={teams[match.home]} />
        <span className="text-zinc-600">v</span>
        <TeamTag team={teams[match.away]} />
        {rest && <span className="ml-auto truncate text-xs text-zinc-500">{rest}</span>}
      </div>
      {borrow && (
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-300">
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{borrow}</span>
        </div>
      )}
      {match.note && <div className="mt-0.5 text-xs text-amber-400/90">{match.note}</div>}
    </div>
  )
}
