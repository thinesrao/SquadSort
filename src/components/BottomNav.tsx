import { ClipboardList, SlidersHorizontal, Users, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ViewId } from '../types'

interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { id: 'roster', label: 'Roster', icon: ClipboardList },
  { id: 'settings', label: 'Setup', icon: SlidersHorizontal },
  { id: 'result', label: 'Teams', icon: Users },
  { id: 'timer', label: 'Timer', icon: Timer },
]

interface BottomNavProps {
  active: ViewId
  onChange: (v: ViewId) => void
  resultReady: boolean
}

/** Fixed bottom tab bar with four large, thumb-friendly targets. */
export function BottomNav({ active, onChange, resultReady }: BottomNavProps) {
  return (
    <nav className="safe-bottom sticky bottom-0 z-20 grid grid-cols-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
              isActive ? 'text-emerald-400' : 'text-zinc-500 active:text-zinc-300'
            }`}
          >
            <span className="relative">
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              {id === 'result' && resultReady && (
                <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-emerald-400" />
              )}
            </span>
            {label}
            {isActive && (
              <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
