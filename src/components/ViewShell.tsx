import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface ViewShellProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  children: ReactNode
}

/** Standard per-view frame: sticky header + padded, scrollable content. */
export function ViewShell({ title, subtitle, icon: Icon, children }: ViewShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 px-5 pb-4 pt-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-800 text-emerald-400">
            <Icon className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight text-zinc-50">{title}</h1>
            {subtitle && <p className="text-sm text-zinc-400">{subtitle}</p>}
          </div>
        </div>
      </header>
      <div className="flex-1 px-5 py-5">{children}</div>
    </div>
  )
}
