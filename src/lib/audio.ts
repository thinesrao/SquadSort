/**
 * Self-contained alarm sounds built with the Web Audio API — no audio assets,
 * works offline. Autoplay policies require the AudioContext to be created/
 * resumed from a user gesture, so call `primeAudio()` on the Start tap.
 *
 * `playBuzzer()` is a one-shot harsh burst (used at the end of an auto-repeat
 * round). `startAlarm()` / `stopAlarm()` drive a loud, piercing two-tone
 * klaxon that repeats until stopped (the "time's up" alarm).
 */

let ctx: AudioContext | null = null
let alarmTimer: number | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

/** Unlock/resume audio from within a user gesture. */
export function primeAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

/** A single harsh two-oscillator square-wave burst at a given frequency. */
function burst(c: AudioContext, freq: number, when: number, dur: number, gain: number) {
  for (const detune of [0, 8]) {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'square'
    osc.frequency.value = freq
    osc.detune.value = detune
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(gain, when + 0.008)
    g.gain.setValueAtTime(gain, when + dur - 0.04)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(when)
    osc.stop(when + dur + 0.02)
  }
}

/** One-shot harsh triple-buzz (round transition). */
export function playBuzzer(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  burst(c, 1245, now, 0.16, 0.7)
  burst(c, 1245, now + 0.22, 0.16, 0.7)
  burst(c, 1660, now + 0.44, 0.26, 0.75)
}

/** Start the repeating piercing klaxon; loops until stopAlarm(). */
export function startAlarm(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  if (alarmTimer != null) return
  let high = false
  const tick = () => {
    const cc = getCtx()
    if (!cc) return
    // Alternating two-tone siren — harsh and attention-grabbing.
    burst(cc, high ? 1660 : 1108, cc.currentTime, 0.28, 0.85)
    high = !high
  }
  tick()
  alarmTimer = window.setInterval(tick, 320)
}

/** Stop the repeating klaxon. */
export function stopAlarm(): void {
  if (alarmTimer != null) {
    window.clearInterval(alarmTimer)
    alarmTimer = null
  }
}
