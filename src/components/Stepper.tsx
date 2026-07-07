import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

/** Chunky -/value/+ control sized for one-handed use. */
export function Stepper({ label, hint, value, min, max, onChange }: StepperProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  const dec = () => onChange(clamp(value - 1))
  const inc = () => onChange(clamp(value + 1))

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="text-base font-semibold text-zinc-100">{label}</div>
          {hint && <div className="text-sm text-zinc-500">{hint}</div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-zinc-800 text-zinc-100 transition active:scale-95 disabled:opacity-30"
        >
          <Minus className="h-6 w-6" strokeWidth={2.5} />
        </button>
        <div className="min-w-16 text-center text-5xl font-black tabular-nums text-emerald-400">
          {value}
        </div>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-zinc-800 text-zinc-100 transition active:scale-95 disabled:opacity-30"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
