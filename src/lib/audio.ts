/**
 * Self-contained "time's up" chime built with the Web Audio API — no audio
 * asset files, works offline. Autoplay policies require the AudioContext to be
 * created/resumed from a user gesture, so call `primeAudio()` on the Start tap.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

/** Unlock/resume audio from within a user gesture. */
export function primeAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

/** Loud, attention-grabbing rising three-beep chime. */
export function playChime(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const now = c.currentTime
  const beeps = [0, 0.32, 0.64]
  const freqs = [880, 1108.73, 1318.51] // A5, C#6, E6
  for (let i = 0; i < beeps.length; i++) {
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freqs[i]
    const t = now + beeps[i]
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.3)
  }
}
