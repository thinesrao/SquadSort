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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
      <div className="mb-2 text-center">
        <div className="text-sm font-semibold text-zinc-100">{label}</div>
        {hint && <div className="text-[11px] text-zinc-500">{hint}</div>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-zinc-100 transition active:scale-95 disabled:opacity-30"
        >
          <Minus className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div className="flex-1 text-center text-3xl font-black tabular-nums text-emerald-400">
          {value}
        </div>
        <button
          type="button"
          onClick={inc}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-zinc-100 transition active:scale-95 disabled:opacity-30"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
