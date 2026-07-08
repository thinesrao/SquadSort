import { useState } from 'react'
import {
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Minus,
  Plus,
  Maximize,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Volume2,
} from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { useWakeLock } from '../hooks/useWakeLock'
import { TIMER_PRESETS_SECONDS } from '../constants'
import type { TimerController } from '../hooks/useTimer'
import type { Match, Team } from '../types'

interface TimerViewProps {
  timer: TimerController
  teams: Team[]
  schedule: Match[]
  currentMatch: number
  matchScores: number[][]
  onBumpScore: (side: 0 | 1, delta: number) => void
  onGoToMatch: (i: number) => void
  autoAdvance: boolean
  onToggleAutoAdvance: (v: boolean) => void
  speakOn: boolean
  onToggleSpeak: (v: boolean) => void
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

const RADIUS = 92
const CIRCUM = 2 * Math.PI * RADIUS

function ChipToggle({
  on,
  icon: Icon,
  label,
  onClick,
}: {
  on: boolean
  icon: typeof Repeat
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition active:scale-95 ${
        on ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-zinc-800 bg-zinc-900 text-zinc-400'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function ScoreSide({
  team,
  score,
  onInc,
  onDec,
}: {
  team: Team
  score: number
  onInc: () => void
  onDec: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="flex items-center gap-1 text-xs font-bold text-zinc-200">
        <span className={`h-2.5 w-2.5 rounded-full ${team.color.swatch}`} aria-hidden />
        {team.color.name}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          aria-label={`${team.color.name} minus`}
          className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-100 active:scale-90"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-7 text-center text-3xl font-black tabular-nums text-emerald-400">
          {score}
        </span>
        <button
          type="button"
          onClick={onInc}
          aria-label={`${team.color.name} plus`}
          className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-100 active:scale-90"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function TimerView({
  timer,
  teams,
  schedule,
  currentMatch,
  matchScores,
  onBumpScore,
  onGoToMatch,
  autoAdvance,
  onToggleAutoAdvance,
  speakOn,
  onToggleSpeak,
}: TimerViewProps) {
  const { duration, remaining, running, round, autoRepeat, setAutoRepeat, start, pause, reset, setDuration } = timer

  const [jumbo, setJumbo] = useState(false)
  useWakeLock(running || jumbo)

  const progress = duration > 0 ? remaining / duration : 0
  const almostDone = remaining <= 10 && remaining > 0 && running
  const ringColor = almostDone ? '#f59e0b' : '#34d399'
  const adjust = (delta: number) => setDuration(Math.max(30, Math.min(60 * 60, duration + delta)))

  const match = schedule[currentMatch]
  const home = match ? teams[match.home] : undefined
  const away = match ? teams[match.away] : undefined
  const score = matchScores[currentMatch] ?? [0, 0]

  const enterJumbo = async () => {
    setJumbo(true)
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      /* fullscreen not allowed */
    }
    try {
      const orient = screen.orientation as unknown as { lock?: (o: string) => Promise<void> }
      await orient.lock?.('landscape')
    } catch {
      /* orientation lock unsupported */
    }
  }
  const exitJumbo = async () => {
    setJumbo(false)
    try {
      ;(screen.orientation as unknown as { unlock?: () => void }).unlock?.()
    } catch {
      /* ignore */
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.()
    } catch {
      /* ignore */
    }
  }

  if (jumbo) {
    return (
      <div onClick={exitJumbo} className="fixed inset-0 z-[90] flex items-center justify-center bg-black">
        <span
          className={`font-black tabular-nums ${almostDone ? 'text-amber-400' : 'text-emerald-400'}`}
          style={{ transform: 'rotate(90deg)', fontSize: 'min(42vh, 62vw)', lineHeight: 1 }}
        >
          {fmt(remaining)}
        </span>
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-zinc-600">
          tap to exit
        </span>
      </div>
    )
  }

  return (
    <ViewShell
      title="Match Timer"
      subtitle="Interval timer with alarm"
      icon={TimerIcon}
      action={
        <button
          type="button"
          onClick={enterJumbo}
          aria-label="Jumbo fullscreen timer"
          className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 active:scale-95"
        >
          <Maximize className="h-3.5 w-3.5" />
          Jumbo
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto pb-1">
        {/* Countdown ring */}
        <div className="relative grid shrink-0 place-items-center">
          <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="#27272a" strokeWidth="13" />
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={CIRCUM}
              strokeDashoffset={CIRCUM * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-5xl font-black tabular-nums ${almostDone ? 'text-amber-400' : 'text-zinc-50'}`}>
              {fmt(remaining)}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              {running ? (autoRepeat ? `Round ${round}` : 'Running') : remaining === 0 ? "Time's up" : 'Ready'}
            </span>
          </div>
        </div>

        {/* Scoreboard for the current fixture */}
        {match && home && away && (
          <div className="w-full shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <button
                type="button"
                onClick={() => onGoToMatch(currentMatch - 1)}
                disabled={currentMatch <= 0}
                aria-label="Previous match"
                className="grid h-6 w-6 place-items-center rounded-md bg-zinc-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              Match {currentMatch + 1} of {schedule.length}
              <button
                type="button"
                onClick={() => onGoToMatch(currentMatch + 1)}
                disabled={currentMatch >= schedule.length - 1}
                aria-label="Next match"
                className="grid h-6 w-6 place-items-center rounded-md bg-zinc-800 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <ScoreSide team={home} score={score[0]} onInc={() => onBumpScore(0, 1)} onDec={() => onBumpScore(0, -1)} />
              <span className="text-sm font-bold text-zinc-600">vs</span>
              <ScoreSide team={away} score={score[1]} onInc={() => onBumpScore(1, 1)} onDec={() => onBumpScore(1, -1)} />
            </div>
          </div>
        )}

        {/* Fine adjust */}
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => adjust(-30)}
            disabled={running}
            aria-label="Subtract 30 seconds"
            className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-zinc-100 active:scale-95 disabled:opacity-30"
          >
            <Minus className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <span className="text-center text-xs text-zinc-400">
            Interval
            <br />
            <span className="text-sm font-semibold text-zinc-200">{fmt(duration)}</span>
          </span>
          <button
            type="button"
            onClick={() => adjust(30)}
            disabled={running}
            aria-label="Add 30 seconds"
            className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-zinc-100 active:scale-95 disabled:opacity-30"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Presets */}
        <div className="flex w-full shrink-0 gap-2">
          {TIMER_PRESETS_SECONDS.map((secs) => {
            const active = duration === secs && !running
            return (
              <button
                key={secs}
                type="button"
                onClick={() => setDuration(secs)}
                disabled={running}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 disabled:opacity-40 ${
                  active ? 'bg-emerald-500 text-emerald-950' : 'border border-zinc-700 bg-zinc-800 text-zinc-200'
                }`}
              >
                {secs / 60}m
              </button>
            )
          })}
        </div>

        {/* Primary controls */}
        <div className="flex w-full shrink-0 gap-3">
          <button
            type="button"
            onClick={running ? pause : start}
            className={`flex flex-[2] items-center justify-center gap-2 rounded-2xl py-4 text-lg font-black transition active:scale-[0.98] ${
              running ? 'bg-amber-500 text-amber-950' : 'bg-emerald-500 text-emerald-950'
            }`}
          >
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset timer"
            className="flex flex-1 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 py-4 text-zinc-200 transition active:scale-[0.98]"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>

        {/* Compact toggles */}
        <div className="flex w-full shrink-0 gap-2">
          <ChipToggle on={autoRepeat} icon={Repeat} label="Repeat" onClick={() => setAutoRepeat(!autoRepeat)} />
          <ChipToggle
            on={autoAdvance}
            icon={FastForward}
            label="Auto-next"
            onClick={() => onToggleAutoAdvance(!autoAdvance)}
          />
          <ChipToggle on={speakOn} icon={Volume2} label="Announce" onClick={() => onToggleSpeak(!speakOn)} />
        </div>
      </div>
    </ViewShell>
  )
}
