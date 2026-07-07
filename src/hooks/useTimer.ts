import { useCallback, useEffect, useRef, useState } from 'react'
import { playChime, primeAudio } from '../lib/audio'

export interface TimerController {
  duration: number // configured length, seconds
  remaining: number // seconds left
  running: boolean
  round: number // increments each completed interval when auto-repeating
  autoRepeat: boolean
  setAutoRepeat: (v: boolean) => void
  start: () => void
  pause: () => void
  reset: () => void
  setDuration: (seconds: number) => void
}

/**
 * Countdown interval timer. Uses an absolute end timestamp so it stays accurate
 * even when the tab is throttled in the background. Plays a chime at zero and,
 * if auto-repeat is on, immediately starts the next interval and bumps `round`.
 */
export function useTimer(initialSeconds: number): TimerController {
  const [duration, setDurationState] = useState(initialSeconds)
  const [remaining, setRemaining] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const [round, setRound] = useState(1)
  const [autoRepeat, setAutoRepeat] = useState(false)

  const endAtRef = useRef<number | null>(null)
  const durationRef = useRef(duration)
  durationRef.current = duration
  const autoRepeatRef = useRef(autoRepeat)
  autoRepeatRef.current = autoRepeat

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endAtRef.current == null) return
      const rem = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000))
      if (rem > 0) {
        setRemaining(rem)
        return
      }
      // Interval elapsed.
      playChime()
      if (autoRepeatRef.current) {
        setRound((r) => r + 1)
        endAtRef.current = Date.now() + durationRef.current * 1000
        setRemaining(durationRef.current)
      } else {
        endAtRef.current = null
        setRemaining(0)
        setRunning(false)
      }
    }
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [running])

  const start = useCallback(() => {
    primeAudio()
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
    endAtRef.current = null
    setRemaining(durationRef.current)
    setRound(1)
  }, [])

  const setDuration = useCallback((seconds: number) => {
    setRunning(false)
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
    setAutoRepeat,
    start,
    pause,
    reset,
    setDuration,
  }
}
