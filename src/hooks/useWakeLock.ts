import { useEffect, useRef } from 'react'

/**
 * Best-effort screen Wake Lock so the phone doesn't dim/sleep while the timer
 * runs pitch-side. Silently no-ops where unsupported (e.g. iOS Safari < 16.4).
 */
export function useWakeLock(active: boolean): void {
  // WakeLockSentinel isn't in every TS DOM lib version; keep it loosely typed.
  const lockRef = useRef<{ release?: () => Promise<void> } | null>(null)

  useEffect(() => {
    let cancelled = false
    const nav = navigator as unknown as {
      wakeLock?: { request: (t: 'screen') => Promise<{ release?: () => Promise<void> }> }
    }

    const acquire = async () => {
      if (!active || !nav.wakeLock) return
      try {
        const lock = await nav.wakeLock.request('screen')
        if (cancelled) {
          void lock.release?.()
          return
        }
        lockRef.current = lock
      } catch {
        // not allowed / not visible — ignore
      }
    }

    const release = () => {
      void lockRef.current?.release?.()
      lockRef.current = null
    }

    if (active) void acquire()
    else release()

    // Re-acquire when the tab becomes visible again (locks drop on hide).
    const onVisible = () => {
      if (active && document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      release()
    }
  }, [active])
}
