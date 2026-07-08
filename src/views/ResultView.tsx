import { useState } from 'react'
import { Users, Copy, Check, Shuffle, Image as ImageIcon, Loader2, Hand } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { TeamCard } from '../components/TeamCard'
import { MatchCard } from '../components/MatchCard'
import { formatForWhatsApp } from '../lib/format'
import { shareTeamsImage } from '../lib/shareImage'
import { usePlayerDrag } from '../hooks/usePlayerDrag'
import type { Match, Settings, Team } from '../types'

interface ResultViewProps {
  teams: Team[]
  schedule: Match[]
  settings: Settings
  onRegenerate: () => void
  onEditTeams: (next: Team[]) => void
  onGoToSetup: () => void
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Grid column count that keeps team columns readable at phone widths. */
function gridColsClass(n: number): string {
  if (n <= 2) return 'grid-cols-2'
  if (n === 4) return 'grid-cols-2'
  return 'grid-cols-3'
}

function EmptyState({ onGoToSetup }: { onGoToSetup: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-zinc-900 text-zinc-600">
        <Users className="h-8 w-8" />
      </span>
      <div>
        <p className="text-lg font-semibold text-zinc-200">No teams yet</p>
        <p className="mt-1 text-sm text-zinc-500">Add players, then generate teams in Setup.</p>
      </div>
      <button
        type="button"
        onClick={onGoToSetup}
        className="rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-emerald-950 transition active:scale-[0.98]"
      >
        Go to Setup
      </button>
    </div>
  )
}

export function ResultView({
  teams,
  schedule,
  settings,
  onRegenerate,
  onEditTeams,
  onGoToSetup,
}: ResultViewProps) {
  const [copied, setCopied] = useState(false)
  const [imgState, setImgState] = useState<'idle' | 'working' | 'done'>('idle')
  const { ghost, overTeamId, activeKey, dragging, startDrag } = usePlayerDrag(teams, onEditTeams)

  if (teams.length === 0) {
    return (
      <ViewShell title="Teams" subtitle="Your generated squads" icon={Users}>
        <EmptyState onGoToSetup={onGoToSetup} />
      </ViewShell>
    )
  }

  const handleCopy = async () => {
    const ok = await copyText(formatForWhatsApp(teams, schedule, settings))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleShareImage = async () => {
    setImgState('working')
    try {
      await shareTeamsImage(teams, schedule, settings)
      setImgState('done')
      window.setTimeout(() => setImgState('idle'), 1800)
    } catch {
      setImgState('idle')
    }
  }

  return (
    <ViewShell
      title="Teams"
      subtitle={`${teams.length} teams · ${teams.reduce((n, t) => n + t.players.length, 0)} players`}
      icon={Users}
      action={
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Re-shuffle teams"
          className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 active:scale-95"
        >
          <Shuffle className="h-4 w-4" />
        </button>
      }
    >
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${dragging ? 'select-none' : ''}`}>
        {/* Team columns — long-press a player to move/swap */}
        <div className={`grid min-h-0 flex-1 gap-2 ${gridColsClass(teams.length)}`}>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onPlayerPointerDown={startDrag}
              activeKey={activeKey}
              isOver={dragging && overTeamId === team.id}
            />
          ))}
        </div>

        <p className="-mt-1 flex shrink-0 items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <Hand className="h-3.5 w-3.5" /> Long-press a player to move or swap
        </p>

        {/* Schedule */}
        {schedule.length > 0 && (
          <div className="shrink-0">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Match Schedule
            </h2>
            <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto">
              {schedule.map((m) => (
                <MatchCard key={m.index} match={m} teams={teams} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold transition active:scale-[0.98] ${
              copied ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700'
            }`}
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button
            type="button"
            onClick={handleShareImage}
            disabled={imgState === 'working'}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold transition active:scale-[0.98] ${
              imgState === 'done' ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-emerald-950'
            }`}
          >
            {imgState === 'working' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : imgState === 'done' ? (
              <Check className="h-5 w-5" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
            {imgState === 'working' ? 'Preparing…' : imgState === 'done' ? 'Shared!' : 'Share image'}
          </button>
        </div>
      </div>

      {/* Floating drag ghost */}
      {dragging && ghost && (
        <div
          className="pointer-events-none fixed z-50 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-bold text-emerald-950 shadow-lg shadow-black/40"
          style={{ left: ghost.x, top: ghost.y, transform: 'translate(-50%, -150%)' }}
        >
          {ghost.name}
        </div>
      )}
    </ViewShell>
  )
}
