/**
 * Thin wrapper over the Vibration API for pitch-side tactile feedback.
 * Progressive enhancement: no-ops where unsupported (e.g. iOS Safari).
 */

export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern)
    }
  } catch {
    // unsupported / blocked — ignore
  }
}

export function stopVibrate(): void {
  vibrate(0)
}

/** Named haptic patterns (ms on/off …). */
export const HAPTIC: {
  tap: number
  pickup: number
  success: number[]
  alarm: number[]
} = {
  tap: 12, // light UI tap
  pickup: 25, // drag pick-up
  success: [28, 40, 28], // teams generated
  alarm: [800, 200, 800, 200, 800, 200, 1500], // aggressive, pulsing: timer done
}
