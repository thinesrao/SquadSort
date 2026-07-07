import { useState } from 'react'
import { Users, Copy, Check, Shuffle, ArrowLeft } from 'lucide-react'
import { ViewShell } from '../components/ViewShell'
import { TeamCard } from '../components/TeamCard'
import { MatchCard } from '../components/MatchCard'
import { formatForWhatsApp } from '../lib/format'
import type { Match, Settings, Team } from '../types'

interface ResultViewProps {
  teams: Team[]
  schedule: Match[]
  settings: Settings
  onRegenerate: () => void
  onGoToSetup: () => void
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

function EmptyState({ onGoToSetup }: { onGoToSetup: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-zinc-900 text-zinc-600">
        <Users className="h-8 w-8" />
      </span>
      <div>
        <p className="text-lg font-semibold text-zinc-200">No teams yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          Add players, then generate teams in Setup.
        </p>
      </div>
      <button
        type="button"
        onClick={onGoToSetup}
        className="rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-emerald-950 transition active:scale-[0.98]"
      >
        Go to Setup
      </button>
    </div>
  )
}

export function ResultView({
  teams,
  schedule,
  settings,
  onRegenerate,
  onGoToSetup,
}: ResultViewProps) {
  const [copied, setCopied] = useState(false)

  if (teams.length === 0) {
    return (
      <ViewShell title="Teams" subtitle="Your generated squads" icon={Users}>
        <EmptyState onGoToSetup={onGoToSetup} />
      </ViewShell>
    )
  }

  const handleCopy = async () => {
    const ok = await copyText(formatForWhatsApp(teams, schedule, settings))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <ViewShell title="Teams" subtitle="Your generated squads" icon={Users}>
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold transition active:scale-[0.98] ${
            copied ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-emerald-950'
          }`}
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
          {copied ? 'Copied!' : 'Copy for WhatsApp'}
        </button>

        <section className="flex flex-col gap-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} targetSize={settings.targetSize} />
          ))}
        </section>

        {schedule.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="mt-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
              Match Schedule
            </h2>
            {schedule.map((m) => (
              <MatchCard key={m.index} match={m} teams={teams} />
            ))}
          </section>
        )}

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onGoToSetup}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 py-3.5 text-base font-semibold text-zinc-200 transition active:scale-[0.98]"
          >
            <ArrowLeft className="h-5 w-5" />
            Setup
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 py-3.5 text-base font-semibold text-zinc-200 transition active:scale-[0.98]"
          >
            <Shuffle className="h-5 w-5" />
            Re-shuffle
          </button>
        </div>
      </div>
    </ViewShell>
  )
}
