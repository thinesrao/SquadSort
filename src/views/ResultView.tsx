import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Users,
  Copy,
  Check,
  Shuffle,
  Image as ImageIcon,
  Loader2,
  Hand,
  Link,
  AlertTriangle,
  ListOrdered,
  Shirt,
  X,
  RotateCcw,
} from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { TeamCard } from '../components/TeamCard'
import { MatchCard } from '../components/MatchCard'
import { formatForWhatsApp } from '../lib/format'
import { shareTeamsImage, type ShareMode } from '../lib/shareImage'
import { buildShareUrl } from '../lib/shareLink'
import { extendSchedule } from '../lib/schedule'
import { swapToTeamBalanced } from '../lib/teamEdit'
import { usePlayerDrag } from '../hooks/usePlayerDrag'
import type { Match, Settings, Team } from '../types'

interface KitSwapTarget {
  teamId: number
  index: number
  name: string
}

interface ResultViewProps {
  teams: Team[]
  schedule: Match[]
  settings: Settings
  paid: Set<string>
  gks: Set<string>
  ratingOf: (name: string) => number
  balancing: boolean
  warnings: string[]
  completed: Set<number>
  onToggleMatchDone: (index: number) => void
  onResetChecklist: () => void
  onTogglePaid: (name: string) => void
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

interface ShareButtonProps {
  label: string
  icon: ReactNode
  onClick: () => void
  busy?: boolean
  done?: boolean
  disabled?: boolean
  primary?: boolean
}

function ShareButton({ label, icon, onClick, busy, done, disabled, primary }: ShareButtonProps) {
  const base = primary
    ? 'bg-emerald-500 text-emerald-950'
    : 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-xs font-bold transition active:scale-[0.97] disabled:opacity-40 ${
        done ? 'bg-emerald-600 text-white' : base
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : icon}
      {done ? 'Shared!' : label}
    </button>
  )
}

interface KitSwapSheetProps {
  target: KitSwapTarget
  teams: Team[]
  onPick: (targetTeamId: number) => void
  onClose: () => void
}

/** Bottom sheet: move a colour-mismatched player to a kit they actually own. */
function KitSwapSheet({ target, teams, onPick, onClose }: KitSwapSheetProps) {
  const fromTeam = teams.find((t) => t.id === target.teamId)
  const others = teams.filter((t) => t.id !== target.teamId)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="animate-view-in w-full max-w-md rounded-t-3xl bg-zinc-900 p-4 pb-6 ring-1 ring-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
              <Shirt className="h-3.5 w-3.5" /> Kit swap
            </div>
            <p className="mt-1 text-base font-bold text-zinc-100">
              Move <span className="text-emerald-300">{target.name}</span> to a kit they own
            </p>
            {fromTeam && (
              <p className="text-xs text-zinc-500">
                Currently on {fromTeam.color.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel kit swap"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={`grid gap-2 ${others.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {others.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl bg-zinc-800 py-3 ring-1 transition active:scale-[0.97] ${t.color.ring}`}
            >
              <span className={`h-4 w-4 rounded-full ${t.color.swatch}`} aria-hidden />
              <span className="text-sm font-bold text-zinc-100">{t.color.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Trades places with the closest-rated player on that team, so the skill balance stays intact.
        </p>
      </div>
    </div>
  )
}

export function ResultView({
  teams,
  schedule,
  settings,
  paid,
  gks,
  ratingOf,
  balancing,
  warnings,
  completed,
  onToggleMatchDone,
  onResetChecklist,
  onTogglePaid,
  onRegenerate,
  onEditTeams,
  onGoToSetup,
}: ResultViewProps) {
  const [copied, setCopied] = useState(false)
  const [linked, setLinked] = useState(false)
  const [shareBusy, setShareBusy] = useState<ShareMode | null>(null)
  const [shareDone, setShareDone] = useState<ShareMode | null>(null)
  const [kitSwap, setKitSwap] = useState<KitSwapTarget | null>(null)
  const { ghost, overTeamId, activeKey, dragging, startDrag } = usePlayerDrag(teams, onEditTeams, (teamId, index, name) =>
    setKitSwap({ teamId, index, name }),
  )

  if (teams.length === 0) {
    return (
      <ViewShell title="Teams" subtitle="Your generated squads" icon={Users}>
        <EmptyState onGoToSetup={onGoToSetup} />
      </ViewShell>
    )
  }

  const strengths = teams.map((t) => t.players.reduce((s, p) => s + ratingOf(p), 0))
  const showStrength = balancing || new Set(teams.flatMap((t) => t.players).map(ratingOf)).size > 1
  const spread = Math.max(...strengths) - Math.min(...strengths)

  const playedCount = schedule.reduce((n, m) => n + (completed.has(m.index) ? 1 : 0), 0)
  const nextIndex = schedule.find((m) => !completed.has(m.index))?.index ?? null

  const handleCopy = async () => {
    const ok = await copyText(formatForWhatsApp(teams, schedule, settings, paid, gks))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  const handleCopyLink = async () => {
    const ok = await copyText(buildShareUrl(teams, settings.targetSize))
    if (ok) {
      setLinked(true)
      window.setTimeout(() => setLinked(false), 1800)
    }
  }

  const handleShare = async (mode: ShareMode) => {
    if (shareBusy) return
    setShareBusy(mode)
    try {
      // The schedule-only image shows an extended running order (a session
      // plays many more games than one round-robin), so teams cycle through
      // the fixtures repeatedly.
      const sched = mode === 'schedule' ? extendSchedule(schedule, 12) : schedule
      await shareTeamsImage(teams, sched, settings, { mode, paid, gks })
      setShareDone(mode)
      window.setTimeout(() => setShareDone((d) => (d === mode ? null : d)), 1800)
    } catch {
      /* ignore */
    } finally {
      setShareBusy(null)
    }
  }

  const chooseKit = (targetTeamId: number) => {
    if (!kitSwap) return
    onEditTeams(swapToTeamBalanced(teams, kitSwap.teamId, kitSwap.index, targetTeamId, ratingOf))
    setKitSwap(null)
  }

  return (
    <ViewShell
      title="Teams"
      subtitle={`${teams.length} teams · ${teams.reduce((n, t) => n + t.players.length, 0)} players`}
      icon={Users}
      action={
        <>
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Copy share link"
            className={`grid h-8 w-8 place-items-center rounded-lg border border-zinc-700 active:scale-95 ${
              linked ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-200'
            }`}
          >
            {linked ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            aria-label="Re-shuffle teams"
            className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-200 active:scale-95"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </>
      }
    >
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${dragging ? 'select-none' : ''}`}>
        {warnings.length > 0 && (
          <div className="flex shrink-0 items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-300 ring-1 ring-amber-500/25">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{warnings.join(' · ')}</span>
          </div>
        )}

        {/* Team columns — long-press a player to move/swap */}
        <div className={`grid min-h-0 flex-1 gap-2 ${gridColsClass(teams.length)}`}>
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onPlayerPointerDown={startDrag}
              activeKey={activeKey}
              isOver={dragging && overTeamId === team.id}
              isPaid={(n) => paid.has(n)}
              onTogglePaid={onTogglePaid}
              isGkName={(n) => gks.has(n)}
            />
          ))}
        </div>

        <div className="-mt-1 flex shrink-0 flex-col items-center gap-0.5">
          {showStrength && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 text-[11px]">
              {teams.map((t, i) => (
                <span key={t.id} className="text-zinc-400">
                  <span className="text-zinc-500">{t.color.name}</span> ★{strengths[i]}
                </span>
              ))}
              <span
                className={`font-semibold ${spread <= 1 ? 'text-emerald-400' : 'text-amber-400'}`}
              >
                {spread === 0 ? 'even' : `±${spread}`}
              </span>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Hand className="h-3.5 w-3.5" /> Tap to swap kit · long-press to move
          </p>
        </div>

        {/* Schedule checklist — tick games off, next one is highlighted */}
        {schedule.length > 0 && (
          <div className="flex min-h-0 shrink flex-col">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Match Schedule
                <span className="ml-1.5 font-semibold text-emerald-400/90">
                  {playedCount}/{schedule.length} played
                </span>
              </h2>
              {playedCount > 0 && (
                <button
                  type="button"
                  onClick={onResetChecklist}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
            <div className="flex max-h-44 min-h-0 flex-col gap-1.5 overflow-y-auto">
              {schedule.map((m) => (
                <MatchCard
                  key={m.index}
                  match={m}
                  teams={teams}
                  done={completed.has(m.index)}
                  isNext={m.index === nextIndex}
                  onToggleDone={() => onToggleMatchDone(m.index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-base font-bold transition active:scale-[0.98] ${
              copied ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700'
            }`}
          >
            {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <div>
            <div className="mb-1 flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              <ImageIcon className="h-3.5 w-3.5" /> Share image
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ShareButton
                label="Teams"
                icon={<Users className="h-4 w-4" />}
                busy={shareBusy === 'teams'}
                done={shareDone === 'teams'}
                onClick={() => handleShare('teams')}
              />
              <ShareButton
                label="Schedule"
                icon={<ListOrdered className="h-4 w-4" />}
                busy={shareBusy === 'schedule'}
                done={shareDone === 'schedule'}
                disabled={schedule.length === 0}
                onClick={() => handleShare('schedule')}
              />
              <ShareButton
                label="Both"
                icon={<ImageIcon className="h-4 w-4" />}
                primary
                busy={shareBusy === 'both'}
                done={shareDone === 'both'}
                onClick={() => handleShare('both')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Kit-swap sheet — tap a player to move them to a colour they own */}
      {kitSwap && (
        <KitSwapSheet
          target={kitSwap}
          teams={teams}
          onPick={chooseKit}
          onClose={() => setKitSwap(null)}
        />
      )}

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
