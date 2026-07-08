import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface ViewShellProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  action?: ReactNode // optional compact controls in the header (right side)
  children: ReactNode
}

/**
 * Full-height per-view frame: a compact fixed header plus a content area that
 * fills the remaining space (min-h-0 so inner scroll regions work). The page
 * itself never scrolls — each view fits one screen and delegates any overflow
 * to a bounded inner region.
 */
export function ViewShell({ title, subtitle, icon: Icon, action, children }: ViewShellProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="safe-top flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-800 text-emerald-400">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-zinc-50">{title}</h1>
          {subtitle && <p className="truncate text-xs text-zinc-400">{subtitle}</p>}
        </div>
        {action && <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-4 py-3">{children}</div>
    </div>
  )
}
