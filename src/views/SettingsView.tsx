import { SlidersHorizontal, Shuffle, AlertTriangle } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { Stepper } from '../components/Stepper'
import { previewTeamSizes } from '../lib/teamGenerator'
import { colorForIndex, MAX_TEAMS, MAX_TEAM_SIZE, MIN_TEAMS, MIN_TEAM_SIZE } from '../constants'
import type { Settings } from '../types'

interface SettingsViewProps {
  settings: Settings
  onChange: (s: Settings) => void
  playerCount: number
  onGenerate: () => void
}

export function SettingsView({ settings, onChange, playerCount, onGenerate }: SettingsViewProps) {
  const { targetSize, teamCount } = settings
  const sizes = previewTeamSizes(playerCount, teamCount, targetSize)
  const lastSize = sizes[sizes.length - 1] ?? 0
  const emptyTeam = sizes.some((s) => s <= 0)
  const deficit = Math.max(0, targetSize - lastSize)

  return (
    <ViewShell title="Setup" subtitle="How should teams be built?" icon={SlidersHorizontal}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Stepper
          label="Target team size"
          hint="Players per side"
          value={targetSize}
          min={MIN_TEAM_SIZE}
          max={MAX_TEAM_SIZE}
          onChange={(v) => onChange({ ...settings, targetSize: v })}
        />
        <Stepper
          label="Number of teams"
          hint={`${MIN_TEAMS}–${MAX_TEAMS} teams`}
          value={teamCount}
          min={MIN_TEAMS}
          max={MAX_TEAMS}
          onChange={(v) => onChange({ ...settings, teamCount: v })}
        />

        {/* Live split preview */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3.5">
          <div className="mb-2 text-xs font-semibold text-zinc-400">
            Preview split · {playerCount} players
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
          {deficit > 0 && !emptyTeam && (
            <p className="mt-2 text-xs text-amber-400/90">
              Team {colorForIndex(teamCount - 1).name} is {deficit} short — a borrow
              schedule will be generated.
            </p>
          )}
        </div>

        {emptyTeam && (
          <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300 ring-1 ring-amber-500/25">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Not enough players to fill {teamCount} teams at this size. Reduce the team
              count or target size.
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={playerCount < 2 || emptyTeam}
          className="mt-auto flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          <Shuffle className="h-5 w-5" />
          Generate teams
        </button>
      </div>
    </ViewShell>
  )
}
