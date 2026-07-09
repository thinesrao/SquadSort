import { useCallback, useEffect, useRef, useState } from 'react'
import { playRoundWhistle, primeAudio, startAlarm, stopAlarm as stopAudioAlarm } from '../lib/audio'
import { vibrate, HAPTIC } from '../lib/haptics'

export interface TimerController {
  duration: number // configured length, seconds
  remaining: number // seconds left
  running: boolean
  round: number // increments each completed interval when auto-repeating
  autoRepeat: boolean
  alarming: boolean // time's up, alarm is blaring until dismissed
  setAutoRepeat: (v: boolean) => void
  start: () => void
  pause: () => void
  reset: () => void
  stopAlarm: () => void
  setDuration: (seconds: number) => void
}

/**
 * Countdown interval timer. Uses an absolute end timestamp so it stays accurate
 * even when the tab is throttled in the background. When an interval ends it
 * either rolls straight into the next round (auto-repeat) or raises a blaring
 * alarm that keeps sounding/vibrating until `stopAlarm()` is called.
 */
export function useTimer(initialSeconds: number): TimerController {
  const [duration, setDurationState] = useState(initialSeconds)
  const [remaining, setRemaining] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const [autoRepeat, setAutoRepeat] = useState(false)
  const [alarming, setAlarming] = useState(false)

  const endAtRef = useRef<number | null>(null)
  const durationRef = useRef(duration)
  durationRef.current = duration
  const autoRepeatRef = useRef(autoRepeat)
  autoRepeatRef.current = autoRepeat

  // Countdown tick.
  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endAtRef.current == null) return
      const rem = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      if (rem > 0) {
        setRemaining(rem)
        return
      }
      if (autoRepeatRef.current) {
        // Roll into the next round with a quick whistle.
        playRoundWhistle()
        vibrate(HAPTIC.alarm)
        setRound((r) => r + 1)
        endAtRef.current = Date.now() + durationRef.current * 1000
        setRemaining(durationRef.current)
      } else {
        endAtRef.current = null
        setRemaining(0)
        setRunning(false)
        setAlarming(true)
      }
    }
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running])

  // Blaring alarm: loop the klaxon + aggressive vibration until dismissed.
  useEffect(() => {
    if (!alarming) return
    startAlarm()
    vibrate(HAPTIC.alarm)
    const buzz = window.setInterval(() => vibrate(HAPTIC.alarm), 5300)
    return () => {
      window.clearInterval(buzz)
      stopAudioAlarm()
      vibrate(0)
    }
  }, [alarming])

  const stopAlarm = useCallback(() => setAlarming(false), [])

  const start = useCallback(() => {
    primeAudio()
    setAlarming(false)
    const secs = remaining > 0 ? remaining : durationRef.current
    if (remaining <= 0) setRemaining(durationRef.current)
    endAtRef.current = Date.now() + secs * 1000
    setRunning(true)
  }, [remaining])

  const pause = useCallback(() => {
    setRunning(false)
    endAtRef.current = null
  }, [])

  const reset = useCallback(() => {
    setRunning(false)
    setAlarming(false)
    endAtRef.current = null
    setRemaining(durationRef.current)
    setRound(1)
  }, [])

  const setDuration = useCallback((seconds: number) => {
    setRunning(false)
    setAlarming(false)
    endAtRef.current = null
    setDurationState(seconds)
    setRemaining(seconds)
    setRound(1)
  }, [])

  return {
    duration,
    remaining,
    running,
    round,
    autoRepeat,
    alarming,
    setAutoRepeat,
    start,
    pause,
    reset,
    stopAlarm,
    setDuration,
  }
}
