import { ArrowLeftRight, Coffee } from 'lucide-react'
import type { Match, Team } from '../types'
import { borrowLabel, restingLabel } from '../lib/format'

interface MatchCardProps {
  match: Match
  teams: Team[]
}

function TeamPill({ team }: { team: Team }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-base font-bold text-zinc-100">
      <span className={`h-3.5 w-3.5 rounded-full ${team.color.swatch}`} aria-hidden />
      {team.color.name}
    </span>
  )
}

/** One match row: the two teams, who rests, and any borrow note. */
export function MatchCard({ match, teams }: MatchCardProps) {
  const rest = restingLabel(match, teams)
  const borrow = borrowLabel(match, teams)

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-zinc-800 text-[11px] text-emerald-400">
          {match.index}
        </span>
        Match {match.index}
      </div>

      <div className="flex items-center justify-center gap-3 py-1">
        <TeamPill team={teams[match.home]} />
        <span className="text-zinc-600">vs</span>
        <TeamPill team={teams[match.away]} />
      </div>

      {rest && (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-sm text-zinc-400">
          <Coffee className="h-4 w-4" />
          {rest}
        </div>
      )}

      {borrow && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-500/25">
          <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{borrow}</span>
        </div>
      )}

      {match.note && (
        <div className="mt-2 text-center text-xs text-amber-400/90">{match.note}</div>
      )}
    </div>
  )
}
