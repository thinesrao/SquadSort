import { BellOff } from 'lucide-react'

interface AlarmOverlayProps {
  onStop: () => void
}

/** Full-screen violently-flashing "time's up" alarm with a Stop button. */
export function AlarmOverlay({ onStop }: AlarmOverlayProps) {
  return (
    <div className="animate-alarm-flash fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <p className="text-6xl font-black uppercase tracking-tight text-white drop-shadow-lg">
          Time's up
        </p>
        <p className="mt-2 text-lg font-bold uppercase tracking-widest text-white/90">
          Full time
        </p>
      </div>
      <button
        type="button"
        onClick={onStop}
        className="flex items-center gap-3 rounded-2xl bg-white px-10 py-6 text-2xl font-black text-zinc-900 shadow-2xl active:scale-95"
      >
        <BellOff className="h-7 w-7" />
        Stop Alarm
      </button>
    </div>
  )
}
