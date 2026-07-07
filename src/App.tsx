import { useMemo } from 'react'
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
import { DEFAULT_SETTINGS, DEFAULT_TIMER_SECONDS } from './constants'
import type { Match, Settings, Team, ViewId } from './types'

export default function App() {
  const [view, setView] = usePersistentState<ViewId>('ss.view', 'roster')
  const [rawInput, setRawInput] = usePersistentState<string>('ss.raw', '')
  const [settings, setSettings] = usePersistentState<Settings>('ss.settings', DEFAULT_SETTINGS)
  const [teams, setTeams] = usePersistentState<Team[]>('ss.teams', [])
  const [schedule, setSchedule] = usePersistentState<Match[]>('ss.schedule', [])

  // Derive players from the raw input so the two never drift apart.
  const players = useMemo(() => parsePlayers(rawInput), [rawInput])

  // Timer state lives at the top level so it keeps running across tab switches.
  const timer = useTimer(DEFAULT_TIMER_SECONDS)
  useWakeLock(timer.running)

  const generate = () => {
    const t = generateTeams(players, settings.teamCount, settings.targetSize)
    setTeams(t)
    setSchedule(generateSchedule(t, settings.targetSize))
    setView('result')
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
            playerCount={players.length}
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
    </div>
  )
}
