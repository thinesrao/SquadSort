import { useEffect, useMemo, useState } from 'react'
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
import { buildTeams } from './lib/teamGenerator'
import { generateSchedule } from './lib/schedule'
import { readSharedFromHash } from './lib/shareLink'
import { speak } from './lib/speech'
import { vibrate, HAPTIC } from './lib/haptics'
import { DEFAULT_SETTINGS, DEFAULT_TIMER_SECONDS } from './constants'
import type { Match, Pairing, Settings, Team, ViewId } from './types'

export default function App() {
  const [view, setView] = usePersistentState<ViewId>('ss.view', 'roster')
  const [rawInput, setRawInput] = usePersistentState<string>('ss.raw', '')
  const [roster, setRoster] = usePersistentState<string[]>('ss.roster', [])
  const [settings, setSettings] = usePersistentState<Settings>('ss.settings', DEFAULT_SETTINGS)
  const [benchedList, setBenchedList] = usePersistentState<string[]>('ss.benched', [])
  const [ratings, setRatings] = usePersistentState<Record<string, number>>('ss.ratings', {})
  const [gkList, setGkList] = usePersistentState<string[]>('ss.gks', [])
  const [showRatings, setShowRatings] = usePersistentState<boolean>('ss.showRatings', false)
  const [balancing, setBalancing] = usePersistentState<boolean>('ss.balance', false)
  const [rollingSubs, setRollingSubs] = usePersistentState<boolean>('ss.rolling', true)
  const [pairings, setPairings] = usePersistentState<Pairing[]>('ss.pairs', [])
  const [paidList, setPaidList] = usePersistentState<string[]>('ss.paid', [])
  const [teams, setTeams] = usePersistentState<Team[]>('ss.teams', [])
  const [schedule, setSchedule] = usePersistentState<Match[]>('ss.schedule', [])
  const [matchScores, setMatchScores] = usePersistentState<number[][]>('ss.scores', [])
  const [currentMatch, setCurrentMatch] = usePersistentState<number>('ss.match', 0)
  const [autoAdvance, setAutoAdvance] = usePersistentState<boolean>('ss.autoadvance', true)
  const [speakOn, setSpeakOn] = usePersistentState<boolean>('ss.speak', false)
  const [warnings, setWarnings] = useState<string[]>([])

  const benched = useMemo(() => new Set(benchedList), [benchedList])
  const gks = useMemo(() => new Set(gkList), [gkList])
  const paid = useMemo(() => new Set(paidList), [paidList])
  const activePlayers = useMemo(() => roster.filter((p) => !benched.has(p)), [roster, benched])
  const ratingOf = (name: string) => ratings[name] ?? 2

  // --- Import shared teams from the URL hash (one-time on load) ---
  useEffect(() => {
    const shared = readSharedFromHash()
    if (!shared) return
    const sched = generateSchedule(shared.teams, shared.targetSize)
    setSettings((s) => ({ ...s, targetSize: shared.targetSize, teamCount: shared.teams.length }))
    setTeams(shared.teams)
    setSchedule(sched)
    setMatchScores(sched.map(() => [0, 0]))
    setCurrentMatch(0)
    setView('result')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Roster editing ---
  const importRaw = (v: string) => {
    setRawInput(v)
    setRoster(parsePlayers(v))
  }
  const addPlayer = (name: string) => {
    const clean = name.trim()
    if (clean) setRoster((prev) => [...prev, clean])
  }
  const renamePlayer = (index: number, name: string) => {
    const clean = name.trim()
    setRoster((prev) => (clean ? prev.map((p, i) => (i === index ? clean : p)) : prev))
  }
  const removePlayer = (index: number) => setRoster((prev) => prev.filter((_, i) => i !== index))

  const toggleBench = (name: string) =>
    setBenchedList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  const setRating = (name: string, value: number) =>
    setRatings((prev) => ({ ...prev, [name]: value }))
  const toggleGk = (name: string) =>
    setGkList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  const togglePaid = (name: string) =>
    setPaidList((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  const addPairing = (p: Pairing) =>
    setPairings((prev) =>
      prev.some((x) => x.a === p.a && x.b === p.b) ? prev : [...prev, p],
    )
  const removePairing = (index: number) => setPairings((prev) => prev.filter((_, i) => i !== index))

  // Timer state lives at the top level so it keeps running across tab switches.
  const timer = useTimer(DEFAULT_TIMER_SECONDS)
  useWakeLock(timer.running)

  const generate = () => {
    const { teamCount, targetSize } = settings
    const activeSet = new Set(activePlayers)
    const keep = (t: Pairing['type']) =>
      pairings
        .filter((p) => p.type === t && activeSet.has(p.a) && activeSet.has(p.b))
        .map((p) => [p.a, p.b] as [string, string])
    const { teams: t, warnings: w } = buildTeams(activePlayers, {
      teamCount,
      targetSize,
      rollingSubs,
      ratingOf: balancing ? ratingOf : null,
      isGk: (n) => gks.has(n),
      keepTogether: keep('together'),
      keepApart: keep('apart'),
    })
    const sched = generateSchedule(t, targetSize)
    setTeams(t)
    setWarnings(w)
    setSchedule(sched)
    setMatchScores(sched.map(() => [0, 0]))
    setCurrentMatch(0)
    vibrate(HAPTIC.success)
    setView('result')
  }

  const editTeams = (next: Team[]) => {
    // A drag swap keeps the same fixtures, so the running scores/game stay put.
    setTeams(next)
    setSchedule(generateSchedule(next, settings.targetSize))
  }

  // --- Scoreboard ---
  const bumpScore = (side: 0 | 1, delta: number) =>
    setMatchScores((prev) => {
      const nextArr = prev.map((a) => [...a])
      while (nextArr.length <= currentMatch) nextArr.push([0, 0])
      const cur = nextArr[currentMatch]
      cur[side] = Math.max(0, (cur[side] ?? 0) + delta)
      return nextArr
    })
  // Games cycle through the round-robin fixtures indefinitely, so a session can
  // run as many games as needed (game N plays fixture N mod scheduleLength).
  const speakMatchup = (i: number) => {
    const m = schedule.length ? schedule[i % schedule.length] : undefined
    if (m) speak(`${teams[m.home]?.color.name} versus ${teams[m.away]?.color.name}`)
  }
  const goToMatch = (i: number) => {
    const clamped = Math.max(0, i)
    setCurrentMatch(clamped)
    if (speakOn) speakMatchup(clamped)
  }
  const advanceMatch = () => {
    if (schedule.length === 0) return
    goToMatch(currentMatch + 1)
  }
  const onAlarmStop = () => {
    timer.stopAlarm()
    if (autoAdvance) advanceMatch()
  }

  const renderView = () => {
    switch (view) {
      case 'roster':
        return (
          <RosterView
            rawInput={rawInput}
            onChangeRaw={importRaw}
            roster={roster}
            ratingOf={ratingOf}
            onRate={setRating}
            isGk={(n) => gks.has(n)}
            onToggleGk={toggleGk}
            showRatings={showRatings}
            onToggleShowRatings={() => setShowRatings((v) => !v)}
            onAddPlayer={addPlayer}
            onRenamePlayer={renamePlayer}
            onRemovePlayer={removePlayer}
            onContinue={() => setView('settings')}
          />
        )
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onChange={setSettings}
            players={roster}
            benched={benched}
            onToggleBench={toggleBench}
            activeCount={activePlayers.length}
            balancing={balancing}
            onToggleBalancing={setBalancing}
            rollingSubs={rollingSubs}
            onToggleRolling={setRollingSubs}
            activePlayers={activePlayers}
            pairings={pairings}
            onAddPairing={addPairing}
            onRemovePairing={removePairing}
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
            gks={gks}
            ratingOf={ratingOf}
            balancing={balancing}
            warnings={warnings}
            onTogglePaid={togglePaid}
            onRegenerate={generate}
            onEditTeams={editTeams}
            onGoToSetup={() => setView('settings')}
          />
        )
      case 'timer':
        return (
          <TimerView
            timer={timer}
            teams={teams}
            schedule={schedule}
            currentMatch={currentMatch}
            matchScores={matchScores}
            onBumpScore={bumpScore}
            onGoToMatch={goToMatch}
            autoAdvance={autoAdvance}
            onToggleAutoAdvance={setAutoAdvance}
            speakOn={speakOn}
            onToggleSpeak={setSpeakOn}
          />
        )
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-zinc-950">
      <main key={view} className="animate-view-in min-h-0 flex-1 overflow-hidden">
        {renderView()}
      </main>
      <BottomNav active={view} onChange={setView} resultReady={teams.length > 0} />
      {timer.alarming && <AlarmOverlay onStop={onAlarmStop} />}
      {/* Vercel Web Analytics — collects page views in production, no-ops locally. */}
      <Analytics />
      {/* Vercel Speed Insights — collects performance metrics in production, no-ops locally. */}
      <SpeedInsights />
    </div>
  )
}
