import { useMemo } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { usePersistentState } from './hooks/usePersistentState'
import { useTimer } from './hooks/useTimer'
import { useWakeLock } from './hooks/useWakeLock'
import { BottomNav } from './components/BottomNav'
import { AlarmOverlay } from './components/AlarmOverlay'
import { RosterView } from './views/RosterView'
import { SettingsView } from './views/SettingsView'
import { ResultView } from './views/ResultView'
import { TimerView } from './views/TimerView'
import { parsePlayers } from './lib/parser'
import { generateTeams, generateBalancedTeams, generateEvenTeams } from './lib/teamGenerator'
import { generateSchedule } from './lib/schedule'
import { vibrate, HAPTIC } from './lib/haptics'
import { DEFAULT_SETTINGS, DEFAULT_TIMER_SECONDS } from './constants'
import type { Match, Settings, Team, ViewId } from './types'

export default function App() {
  const [view, setView] = usePersistentState<ViewId>('ss.view', 'roster')
  const [rawInput, setRawInput] = usePersistentState<string>('ss.raw', '')
  const [settings, setSettings] = usePersistentState<Settings>('ss.settings', DEFAULT_SETTINGS)
  const [benchedList, setBenchedList] = usePersistentState<string[]>('ss.benched', [])
  const [ratings, setRatings] = usePersistentState<Record<string, number>>('ss.ratings', {})
  const [showRatings, setShowRatings] = usePersistentState<boolean>('ss.showRatings', false)
  const [balancing, setBalancing] = usePersistentState<boolean>('ss.balance', false)
  const [rollingSubs, setRollingSubs] = usePersistentState<boolean>('ss.rolling', true)
  const [paidList, setPaidList] = usePersistentState<string[]>('ss.paid', [])
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
  const paid = useMemo(() => new Set(paidList), [paidList])

  // Ratings persist across sessions and auto-apply to recognized names.
  const ratingOf = (name: string) => ratings[name] ?? 2

  const toggleBench = (name: string) =>
    setBenchedList((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    )
  const setRating = (name: string, value: number) =>
    setRatings((prev) => ({ ...prev, [name]: value }))
  const togglePaid = (name: string) =>
    setPaidList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))

  // Timer state lives at the top level so it keeps running across tab switches.
  const timer = useTimer(DEFAULT_TIMER_SECONDS)
  useWakeLock(timer.running)

  const generate = () => {
    const { teamCount, targetSize } = settings
    const rf = balancing ? ratingOf : null
    const t = rollingSubs
      ? generateEvenTeams(activePlayers, teamCount, targetSize, rf)
      : balancing
        ? generateBalancedTeams(activePlayers, ratingOf, teamCount, targetSize)
        : generateTeams(activePlayers, teamCount, targetSize)
    setTeams(t)
    setSchedule(generateSchedule(t, targetSize))
    vibrate(HAPTIC.success)
    setView('result')
  }

  // Manual edit (drag swap / move): persist new teams and refresh the schedule.
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
            ratingOf={ratingOf}
            onRate={setRating}
            showRatings={showRatings}
            onToggleShowRatings={() => setShowRatings((v) => !v)}
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
            balancing={balancing}
            onToggleBalancing={setBalancing}
            rollingSubs={rollingSubs}
            onToggleRolling={setRollingSubs}
            onGenerate={generate}
          />
        )
      case 'result':
        return (
          <ResultView
            teams={teams}
            schedule={schedule}
            settings={settings}
            paid={paid}
            onTogglePaid={togglePaid}
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
      {timer.alarming && <AlarmOverlay onStop={timer.stopAlarm} />}
      {/* Vercel Web Analytics — collects page views in production, no-ops locally. */}
      <Analytics />
      {/* Vercel Speed Insights — collects performance metrics in production, no-ops locally. */}
      <SpeedInsights />
    </div>
  )
}
