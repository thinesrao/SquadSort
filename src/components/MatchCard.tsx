import { ArrowLeftRight, Check, Circle } from 'lucide-react'
import type { Match, Team } from '../types'
import { borrowLabel, restingLabel } from '../lib/format'

interface MatchCardProps {
  match: Match
  teams: Team[]
  /** Checklist mode (Teams view): tick a game off / highlight what's next. */
  done?: boolean
  isNext?: boolean
  onToggleDone?: () => void
}

function TeamTag({ team, dim }: { team: Team; dim?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${dim ? 'text-zinc-500' : 'text-zinc-100'}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${team.color.swatch}`} aria-hidden />
      {team.color.name}
    </span>
  )
}

/** Compact single-row match with an optional borrow sub-line + checklist tick. */
export function MatchCard({ match, teams, done, isNext, onToggleDone }: MatchCardProps) {
  const rest = restingLabel(match, teams)
  const borrow = borrowLabel(match, teams)
  const checklist = !!onToggleDone

  return (
    <div
      className={`rounded-lg border px-2.5 py-1.5 transition ${
        isNext
          ? 'border-emerald-500/50 bg-emerald-500/10'
          : done
            ? 'border-zinc-800/60 bg-zinc-900/40'
            : 'border-zinc-800 bg-zinc-900'
      }`}
    >
      <div className="flex items-center gap-2 text-sm">
        {checklist ? (
          <button
            type="button"
            onClick={onToggleDone}
            aria-label={`Mark game ${match.index} ${done ? 'not played' : 'played'}`}
            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full transition active:scale-90 ${
              done ? 'bg-emerald-500 text-emerald-950' : 'text-zinc-500'
            }`}
          >
            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Circle className="h-4 w-4" />}
          </button>
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-zinc-800 text-[11px] font-bold text-emerald-400">
            {match.index}
          </span>
        )}
        {checklist && (
          <span className={`w-4 shrink-0 text-right text-[11px] font-bold tabular-nums ${done ? 'text-zinc-600' : 'text-zinc-500'}`}>
            {match.index}
          </span>
        )}
        <TeamTag team={teams[match.home]} dim={done} />
        <span className={done ? 'text-zinc-700' : 'text-zinc-600'}>v</span>
        <TeamTag team={teams[match.away]} dim={done} />
        {isNext ? (
          <span className="ml-auto rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950">
            Next
          </span>
        ) : (
          rest && <span className="ml-auto truncate text-xs text-zinc-500">{rest}</span>
        )}
      </div>
      {borrow && !done && (
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-300">
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{borrow}</span>
        </div>
      )}
      {match.note && !done && <div className="mt-0.5 text-xs text-amber-400/90">{match.note}</div>}
    </div>
  )
}
