import { Timer as TimerIcon, Play, Pause, RotateCcw, Repeat, Minus, Plus } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { TIMER_PRESETS_SECONDS } from '../constants'
import type { TimerController } from '../hooks/useTimer'

interface TimerViewProps {
  timer: TimerController
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

const RADIUS = 104
const CIRCUM = 2 * Math.PI * RADIUS

export function TimerView({ timer }: TimerViewProps) {
  const {
    duration,
    remaining,
    running,
    round,
    autoRepeat,
    setAutoRepeat,
    start,
    pause,
    reset,
    setDuration,
  } = timer

  const progress = duration > 0 ? remaining / duration : 0
  const almostDone = remaining <= 10 && remaining > 0 && running
  const ringColor = almostDone ? '#f59e0b' : '#34d399'

  const adjust = (delta: number) => setDuration(Math.max(30, Math.min(60 * 60, duration + delta)))

  return (
    <ViewShell title="Match Timer" subtitle="Interval timer with chime" icon={TimerIcon}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-3 py-1">
        {/* Countdown ring */}
        <div className="relative grid place-items-center">
          <svg width="240" height="240" viewBox="0 0 240 240" className="-rotate-90">
            <circle cx="120" cy="120" r={RADIUS} fill="none" stroke="#27272a" strokeWidth="14" />
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUM}
              strokeDashoffset={CIRCUM * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span
              className={`text-6xl font-black tabular-nums ${
                almostDone ? 'text-amber-400' : 'text-zinc-50'
              }`}
            >
              {fmt(remaining)}
            </span>
            <span className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {running
                ? autoRepeat
                  ? `Round ${round}`
                  : 'Running'
                : remaining === 0
                  ? "Time's up"
                  : 'Ready'}
            </span>
          </div>
        </div>

        {/* Fine adjust */}
        <div className="flex items-center gap-4">
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
        <div className="flex w-full gap-2">
          {TIMER_PRESETS_SECONDS.map((secs) => {
            const active = duration === secs && !running
            return (
              <button
                key={secs}
                type="button"
                onClick={() => setDuration(secs)}
                disabled={running}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition active:scale-95 disabled:opacity-40 ${
                  active
                    ? 'bg-emerald-500 text-emerald-950'
                    : 'border border-zinc-700 bg-zinc-800 text-zinc-200'
                }`}
              >
                {secs / 60}m
              </button>
            )
          })}
        </div>

        {/* Primary controls */}
        <div className="flex w-full gap-3">
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

        {/* Auto-repeat toggle */}
        <button
          type="button"
          onClick={() => setAutoRepeat(!autoRepeat)}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition active:scale-[0.98] ${
            autoRepeat ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900'
          }`}
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-zinc-100">
            <Repeat className={`h-5 w-5 ${autoRepeat ? 'text-emerald-400' : 'text-zinc-500'}`} />
            Auto-repeat rounds
          </span>
          <span
            className={`relative h-6 w-11 rounded-full transition ${
              autoRepeat ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                autoRepeat ? 'left-6' : 'left-1'
              }`}
            />
          </span>
        </button>
      </div>
    </ViewShell>
  )
}
