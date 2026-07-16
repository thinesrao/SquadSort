import { useState } from 'react'
import {
  SlidersHorizontal,
  Shuffle,
  AlertTriangle,
  UserMinus,
  Scale,
  Repeat,
  Lightbulb,
  Link2,
  Plus,
  X,
  ClipboardList,
} from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { Stepper } from '../components/Stepper'
import { previewSizes, recommendedTeamCount } from '../lib/teamGenerator'
import { vibrate, HAPTIC } from '../lib/haptics'
import { colorForIndex, MAX_TEAMS, MAX_TEAM_SIZE, MIN_TEAMS, MIN_TEAM_SIZE } from '../constants'
import type { Pairing, Settings } from '../types'

interface SettingsViewProps {
  settings: Settings
  onChange: (s: Settings) => void
  players: string[]
  benched: Set<string>
  onToggleBench: (name: string) => void
  activeCount: number
  balancing: boolean
  onToggleBalancing: (v: boolean) => void
  rollingSubs: boolean
  onToggleRolling: (v: boolean) => void
  activePlayers: string[]
  pairings: Pairing[]
  onAddPairing: (p: Pairing) => void
  onRemovePairing: (index: number) => void
  onGenerate: () => void
  onImportSchedule: (text: string) => boolean
}

function Toggle({
  on,
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  on: boolean
  icon: typeof Scale
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition active:scale-[0.98] ${
        on ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'
      }`}
    >
      <span className="flex items-center gap-3 text-sm font-semibold text-zinc-100">
        <Icon className={`h-5 w-5 ${on ? 'text-emerald-400' : 'text-zinc-500'}`} />
        <span className="text-left">
          {title}
          <span className="block text-[11px] font-normal text-zinc-500">{subtitle}</span>
        </span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
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
  activePlayers,
  pairings,
  onAddPairing,
  onRemovePairing,
  onGenerate,
  onImportSchedule,
}: SettingsViewProps) {
  const { targetSize, teamCount } = settings
  const sizes = previewSizes(activeCount, teamCount, targetSize, rollingSubs)
  const lastSize = sizes[sizes.length - 1] ?? 0
  const emptyTeam = sizes.some((s) => s <= 0)
  const deficit = Math.max(0, targetSize - lastSize)
  const benchedCount = players.length - activeCount
  const rec = recommendedTeamCount(activeCount)
  const showRec = activeCount >= 2 && rec !== teamCount

  const [pairOpen, setPairOpen] = useState(false)
  const [selA, setSelA] = useState('')
  const [selB, setSelB] = useState('')
  const [ptype, setPtype] = useState<Pairing['type']>('together')

  const [schedOpen, setSchedOpen] = useState(false)
  const [schedText, setSchedText] = useState('')
  const [schedErr, setSchedErr] = useState(false)
  const useSchedule = () => {
    if (!onImportSchedule(schedText)) setSchedErr(true)
  }

  const bench = (name: string) => {
    vibrate(HAPTIC.tap)
    onToggleBench(name)
  }
  const addPair = () => {
    if (selA && selB && selA !== selB) {
      onAddPairing({ a: selA, b: selB, type: ptype })
      setSelA('')
      setSelB('')
    }
  }

  return (
    <ViewShell title="Setup" subtitle="How should teams be built?" icon={SlidersHorizontal}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
          <Toggle
            on={balancing}
            icon={Scale}
            title="Skill balancing"
            subtitle="Spread ⭐ ratings evenly (snake draft)"
            onClick={() => {
              vibrate(HAPTIC.tap)
              onToggleBalancing(!balancing)
            }}
          />
          <Toggle
            on={rollingSubs}
            icon={Repeat}
            title="Rolling subs"
            subtitle="Even teams — split extra players as subs"
            onClick={() => {
              vibrate(HAPTIC.tap)
              onToggleRolling(!rollingSubs)
            }}
          />

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

          {showRec && (
            <button
              type="button"
              onClick={() => onChange({ ...settings, teamCount: rec })}
              className="flex items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200 active:scale-[0.98]"
            >
              <Lightbulb className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="flex-1">
                {activeCount} players → play <b>{rec} teams</b>{' '}
                {rec === 2 ? '(White vs Black · rolling subs)' : '(3-team 8-min rotations)'}
              </span>
              <span className="font-bold">Use</span>
            </button>
          )}

          {/* Pairings: keep together / apart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                <Link2 className="h-3.5 w-3.5" /> Pairings
              </span>
              <button
                type="button"
                onClick={() => setPairOpen((o) => !o)}
                className="text-[11px] font-semibold text-emerald-400 active:scale-95"
              >
                {pairOpen ? 'Close' : '+ Add rule'}
              </button>
            </div>
            {pairings.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {pairings.map((p, i) => (
                  <span
                    key={`${p.a}-${p.b}-${i}`}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.type === 'together'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {p.a} {p.type === 'together' ? '＋' : '✕'} {p.b}
                    <button type="button" onClick={() => onRemovePairing(i)} aria-label="Remove pairing">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {pairOpen && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  {[
                    [selA, setSelA] as const,
                    [selB, setSelB] as const,
                  ].map(([val, set], idx) => (
                    <select
                      key={idx}
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:outline-none"
                    >
                      <option value="">{idx === 0 ? 'Player A' : 'Player B'}</option>
                      {activePlayers.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-1 overflow-hidden rounded-lg border border-zinc-700">
                    {(['together', 'apart'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setPtype(t)}
                        className={`flex-1 py-2 text-xs font-semibold capitalize transition ${
                          ptype === t ? 'bg-emerald-500 text-emerald-950' : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addPair}
                    disabled={!selA || !selB || selA === selB}
                    className="flex items-center gap-1 rounded-lg bg-zinc-700 px-3 text-sm font-semibold text-zinc-100 active:scale-95 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import a ready-made schedule pasted from a chat / previous week */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
                <ClipboardList className="h-3.5 w-3.5" /> Import a schedule
              </span>
              <button
                type="button"
                onClick={() => setSchedOpen((o) => !o)}
                className="text-[11px] font-semibold text-emerald-400 active:scale-95"
              >
                {schedOpen ? 'Close' : 'Paste'}
              </button>
            </div>
            {schedOpen && (
              <div className="mt-2 flex flex-col gap-2">
                <textarea
                  value={schedText}
                  onChange={(e) => {
                    setSchedText(e.target.value)
                    setSchedErr(false)
                  }}
                  rows={5}
                  placeholder={'Paste a schedule, e.g.\n1. ⚪ White vs ⚫ Black\n2. ⚫ Black vs 🔴 Red\n…'}
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
                {schedErr && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Couldn’t find any matches. Use lines like “1. White vs Black”.
                  </p>
                )}
                <button
                  type="button"
                  onClick={useSchedule}
                  disabled={!schedText.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg bg-zinc-700 py-2.5 text-sm font-bold text-zinc-100 active:scale-[0.98] disabled:opacity-40"
                >
                  <ClipboardList className="h-4 w-4" /> Use this schedule
                </button>
              </div>
            )}
          </div>

          {/* Squad pool — tap a player to bench / un-bench for late dropouts */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
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
              <div className="flex flex-wrap gap-1.5">
                {players.map((name, i) => {
                  const isBenched = benched.has(name)
                  return (
                    <button
                      key={`${name}-${i}`}
                      type="button"
                      onClick={() => bench(name)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                        isBenched ? 'bg-zinc-800/50 text-zinc-600 line-through' : 'bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Live split preview */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
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
                Not enough active players for {teamCount} teams. Un-bench someone or lower the team
                count.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={activeCount < 2 || emptyTeam}
          className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-emerald-950 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          <Shuffle className="h-5 w-5" />
          Generate teams
        </button>
      </div>
    </ViewShell>
  )
}
