import { useMemo } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { usePersistentState } from './hooks/usePersistentState'
import { useTimer } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { BottomNav } from './components/BottomNav'
import { RosterView } from './views/RosterView'
import { SettingsView } from './views/SettingsView'
import { ResultView } from './views/ResultView'
import { TimerView } from './views/TimerView'
import { parsePlayers } from './lib/parser'
import { generateTeams } from './lib/teamGenerator'
import { generateSchedule } from './lib/schedule'
import { vibrate, HAPTIC } from './lib/haptics'
import { DEFAULT_SETTINGS, DEFAULT_TIMER_SECONDS } from './constants'
import type { Match, Settings, Team, ViewId } from './types'

export default function App() {
  const [view, setView] = usePersistentState<ViewId>('ss.view', 'roster')
  const [rawInput, setRawInput] = usePersistentState<string>('ss.raw', '')
  const [settings, setSettings] = usePersistentState<Settings>('ss.settings', DEFAULT_SETTINGS)
  const [benchedList, setBenchedList] = usePersistentState<string[]>('ss.benched', [])
  const [teams, setTeams] = usePersistentState<Team[]>('ss.teams', [])
  const [schedule, setSchedule] = usePersistentState<Match[]>('ss.schedule', [])

  // Derive players from the raw input so the two never drift apart.
  const players = useMemo(() => parsePlayers(rawInput), [rawInput])

  // "Quick Bench": excluded players are dropped from the active pool.
  const benched = useMemo(() => new Set(benchedList), [benchedList])
  const activePlayers = useMemo(
    () => players.filter((p) => !benched.has(p)),
    [players, benched],
  )

  const toggleBench = (name: string) =>
    setBenchedList((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )

  // Timer state lives at the top level so it keeps running across tab switches.
  const timer = useTimer(DEFAULT_TIMER_SECONDS)
  useWakeLock(timer.running)

  const generate = () => {
    const t = generateTeams(activePlayers, settings.teamCount, settings.targetSize)
    setTeams(t)
    setSchedule(generateSchedule(t, settings.targetSize))
    vibrate(HAPTIC.success)
    setView('result')
  }

  // Manual edit (drag swap / move): persist new teams and refresh the schedule
  // so borrow notes stay accurate if sizes changed.
  const editTeams = (next: Team[]) => {
    setTeams(next)
    setSchedule(generateSchedule(next, settings.targetSize))
  }

  const renderView = () => {
    switch (view) {
      case 'roster':
        return (
          <RosterView
            rawInput={rawInput}
            onChangeRaw={setRawInput}
            players={players}
            onContinue={() => setView('settings')}
          />
        )
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onChange={setSettings}
            players={players}
            benched={benched}
            onToggleBench={toggleBench}
            activeCount={activePlayers.length}
            onGenerate={generate}
          />
        )
      case 'result':
        return (
          <ResultView
            teams={teams}
            schedule={schedule}
            settings={settings}
            onRegenerate={generate}
            onEditTeams={editTeams}
            onGoToSetup={() => setView('settings')}
          />
        )
      case 'timer':
        return <TimerView timer={timer} />
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-zinc-950">
      <main key={view} className="animate-view-in min-h-0 flex-1 overflow-hidden">
        {renderView()}
      </main>
      <BottomNav active={view} onChange={setView} resultReady={teams.length > 0} />
      {/* Vercel Web Analytics — collects page views in production, no-ops locally. */}
      <Analytics />
      {/* Vercel Speed Insights — collects performance metrics in production, no-ops locally. */}
      <SpeedInsights />
    </div>
  )
}
