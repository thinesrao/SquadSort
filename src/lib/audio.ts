/**
 * Self-contained alarm sounds built with the Web Audio API — no audio assets,
 * works offline. Autoplay policies require the AudioContext to be created/
 * resumed from a user gesture, so call `primeAudio()` on the Start tap.
 *
 * The "time's up" alarm is a synthesized **referee full-time whistle**: a
 * warbling ~3.3 kHz pea-whistle tone with band-passed air noise, played as a
 * repeating peep–peep–peeeep until dismissed.
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

function whiteNoise(c: AudioContext, dur: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(dur * c.sampleRate))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  return src
}

/** A single referee-whistle blast: warbling tone + air hiss. */
function whistle(c: AudioContext, when: number, dur: number, level = 0.9) {
  const master = c.createGain()
  master.connect(c.destination)
  master.gain.setValueAtTime(0.0001, when)
  master.gain.exponentialRampToValueAtTime(level, when + 0.025)
  master.gain.setValueAtTime(level, when + Math.max(0.06, dur - 0.07))
  master.gain.exponentialRampToValueAtTime(0.0001, when + dur)

  // Fundamental + overtone give the shrill pea-whistle timbre.
  const o1 = c.createOscillator()
  o1.type = 'sine'
  o1.frequency.value = 3350
  const o2 = c.createOscillator()
  o2.type = 'sine'
  o2.frequency.value = 5025
  const o2g = c.createGain()
  o2g.gain.value = 0.3

  // Fast vibrato = the rattling pea.
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 17
  const lfoGain = c.createGain()
  lfoGain.gain.value = 60
  lfo.connect(lfoGain)
  lfoGain.connect(o1.frequency)
  lfoGain.connect(o2.frequency)

  o1.connect(master)
  o2.connect(o2g)
  o2g.connect(master)

  // Breathy air noise, band-passed around the whistle pitch.
  const noise = whiteNoise(c, dur + 0.05)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 3400
  bp.Q.value = 5
  const ng = c.createGain()
  ng.gain.value = 0.05
  noise.connect(bp)
  bp.connect(ng)
  ng.connect(master)

  const stopAt = when + dur + 0.03
  o1.start(when)
  o2.start(when)
  lfo.start(when)
  noise.start(when)
  o1.stop(stopAt)
  o2.stop(stopAt)
  lfo.stop(stopAt)
  noise.stop(stopAt)
}

/** Short double-pip whistle at an auto-repeat round transition. */
export function playBuzzer(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const now = c.currentTime
  whistle(c, now, 0.3)
  whistle(c, now + 0.48, 0.3)
}

/** Start the repeating full-time whistle (peep–peep–peeeep); loops until stopAlarm(). */
export function startAlarm(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  if (alarmTimer != null) return
  const sequence = () => {
    const cc = getCtx()
    if (!cc) return
    const t = cc.currentTime
    whistle(cc, t + 0.0, 0.4)
    whistle(cc, t + 0.55, 0.4)
    whistle(cc, t + 1.1, 1.0) // long final blast = full time
  }
  sequence()
  alarmTimer = window.setInterval(sequence, 3000)
}

/** Stop the repeating whistle. */
export function stopAlarm(): void {
  if (alarmTimer != null) {
    window.clearInterval(alarmTimer)
    alarmTimer = null
  }
}
