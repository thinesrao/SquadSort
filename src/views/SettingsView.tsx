import { SlidersHorizontal, Shuffle, AlertTriangle, UserMinus, Scale, Repeat, Lightbulb } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { Stepper } from '../components/Stepper'
import { previewSizes, recommendedTeamCount } from '../lib/teamGenerator'
import { vibrate, HAPTIC } from '../lib/haptics'
import { colorForIndex, MAX_TEAMS, MAX_TEAM_SIZE, MIN_TEAMS, MIN_TEAM_SIZE } from '../constants'
import type { Settings } from '../types'

interface SettingsViewProps {
  settings: Settings
  onChange: (s: Settings) => void
  players: string[] // all parsed players
  benched: Set<string> // excluded from the active pool
  onToggleBench: (name: string) => void
  activeCount: number // players.length minus benched
  balancing: boolean
  onToggleBalancing: (v: boolean) => void
  rollingSubs: boolean
  onToggleRolling: (v: boolean) => void
  onGenerate: () => void
}

export function SettingsView({
  settings,
  onChange,
  players,
  benched,
  onToggleBench,
  activeCount,
  balancing,
  onToggleBalancing,
  rollingSubs,
  onToggleRolling,
  onGenerate,
}: SettingsViewProps) {
  const { targetSize, teamCount } = settings
  const sizes = previewSizes(activeCount, teamCount, targetSize, rollingSubs)
  const lastSize = sizes[sizes.length - 1] ?? 0
  const emptyTeam = sizes.some((s) => s <= 0)
  const deficit = Math.max(0, targetSize - lastSize)
  const benchedCount = players.length - activeCount
  const rec = recommendedTeamCount(activeCount)
  const showRec = activeCount >= 2 && rec !== teamCount

  const toggle = (name: string) => {
    vibrate(HAPTIC.tap)
    onToggleBench(name)
  }

  return (
    <ViewShell title="Setup" subtitle="How should teams be built?" icon={SlidersHorizontal}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* Skill balancing master toggle */}
        <button
          type="button"
          onClick={() => {
            vibrate(HAPTIC.tap)
            onToggleBalancing(!balancing)
          }}
          className={`flex shrink-0 items-center justify-between rounded-2xl border px-4 py-3 transition active:scale-[0.98] ${
            balancing ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'
          }`}
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-zinc-100">
            <Scale className={`h-5 w-5 ${balancing ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span className="text-left">
              Skill balancing
              <span className="block text-[11px] font-normal text-zinc-500">
                Spread ⭐ ratings evenly (snake draft)
              </span>
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              balancing ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                balancing ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>

        {/* Rolling subs master toggle */}
        <button
          type="button"
          onClick={() => {
            vibrate(HAPTIC.tap)
            onToggleRolling(!rollingSubs)
          }}
          className={`flex shrink-0 items-center justify-between rounded-2xl border px-4 py-3 transition active:scale-[0.98] ${
            rollingSubs ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'
          }`}
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-zinc-100">
            <Repeat className={`h-5 w-5 ${rollingSubs ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span className="text-left">
              Rolling subs
              <span className="block text-[11px] font-normal text-zinc-500">
                Even teams — split extra players as subs
              </span>
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              rollingSubs ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                rollingSubs ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>

        <div className="flex gap-3">
          <div className="flex-1">
            <Stepper
              label="Team size"
              hint="Per side"
              value={targetSize}
              min={MIN_TEAM_SIZE}
              max={MAX_TEAM_SIZE}
              onChange={(v) => onChange({ ...settings, targetSize: v })}
            />
          </div>
          <div className="flex-1">
            <Stepper
              label="Teams"
              hint={`${MIN_TEAMS}–${MAX_TEAMS}`}
              value={teamCount}
              min={MIN_TEAMS}
              max={MAX_TEAMS}
              onChange={(v) => onChange({ ...settings, teamCount: v })}
            />
          </div>
        </div>

        {/* Game-rule recommendation: <=18 -> 2 teams, >=19 -> 3 teams */}
        {showRec && (
          <button
            type="button"
            onClick={() => onChange({ ...settings, teamCount: rec })}
            className="flex shrink-0 items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200 active:scale-[0.98]"
          >
            <Lightbulb className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="flex-1">
              {activeCount} players → play <b>{rec} teams</b>{' '}
              {rec === 2 ? '(White vs Black · rolling subs)' : '(3-team 8-min rotations)'}
            </span>
            <span className="font-bold">Use</span>
          </button>
        )}

        {/* Squad pool — tap a player to bench / un-bench for late dropouts */}
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-400">
              Squad pool
              {benchedCount > 0 && (
                <span className="ml-1.5 text-amber-400/90">· {benchedCount} benched</span>
              )}
            </span>
            <span className="flex items-center gap-1 text-zinc-500">
              <UserMinus className="h-3.5 w-3.5" /> tap to bench
            </span>
          </div>
          {players.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              No players yet — add them in the Roster tab.
            </p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-wrap gap-1.5">
                {players.map((name, i) => {
                  const isBenched = benched.has(name)
                  return (
                    <button
                      key={`${name}-${i}`}
                      type="button"
                      onClick={() => toggle(name)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                        isBenched
                          ? 'bg-zinc-800/50 text-zinc-600 line-through'
                          : 'bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live split preview */}
        <div className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-2 text-xs font-semibold text-zinc-400">
            Preview split · {activeCount} active
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((size, i) => {
              const color = colorForIndex(i)
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-sm font-semibold text-zinc-100"
                >
                  <span className={`h-3 w-3 rounded-full ${color.swatch}`} aria-hidden />
                  {color.name}
                  <span className="tabular-nums text-emerald-400">{size}</span>
                </span>
              )
            })}
          </div>
          {rollingSubs && !emptyTeam && sizes.some((s) => s > targetSize) && (
            <p className="mt-2 text-xs text-emerald-400/90">
              Even teams — {sizes.reduce((n, s) => n + Math.max(0, s - targetSize), 0)} extra
              player(s) split as rolling subs.
            </p>
          )}
          {deficit > 0 && !emptyTeam && (
            <p className="mt-2 text-xs text-amber-400/90">
              Team {colorForIndex(teamCount - 1).name} is {deficit} short — a borrow schedule
              will be generated.
            </p>
          )}
          {emptyTeam && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Not enough active players for {teamCount} teams. Un-bench someone or lower the
              team count.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={activeCount < 2 || emptyTeam}
          className="shrink-0 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          <Shuffle className="h-5 w-5" />
          Generate teams
        </button>
      </div>
    </ViewShell>
  )
}
