/**
 * Alarm + whistle sounds, tuned to actually be heard on a phone.
 *
 * iOS notes (Chrome on iPhone is WebKit too):
 *  - The Web Audio API is silenced by the hardware ring/silent switch, but an
 *    HTMLMediaElement (`<audio>`) ignores it (like a video/music player). So the
 *    alarm is pre-rendered to a WAV clip and played through a media element,
 *    with the raw Web Audio graph kept only as a fallback.
 *  - Media playback must be unlocked by a user gesture — `primeAudio()` does
 *    that on the Start/Test tap.
 *  - There is no Vibration API on iOS, and JS timers pause when the screen
 *    locks, so keep the screen awake (the timer holds a Wake Lock while running).
 */

type AnyAudioContext = typeof AudioContext

function getAC(): AnyAudioContext | null {
  if (typeof window === 'undefined') return null
  return window.AudioContext || (window as unknown as { webkitAudioContext?: AnyAudioContext }).webkitAudioContext || null
}

let ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  const AC = getAC()
  if (!AC) return null
  if (!ctx) ctx = new AC()
  return ctx
}

// --- Whistle synthesis (works in a live or offline context) -----------------
/** One referee-whistle blast: harsh sawtooth tone + fast warble + air noise. */
function whistleBlast(c: BaseAudioContext, dest: AudioNode, when: number, dur: number, level: number) {
  const master = c.createGain()
  master.connect(dest)
  master.gain.setValueAtTime(0.0001, when)
  master.gain.exponentialRampToValueAtTime(level, when + 0.02)
  master.gain.setValueAtTime(level, when + Math.max(0.06, dur - 0.06))
  master.gain.exponentialRampToValueAtTime(0.0001, when + dur)

  // Sawtooth = rich harmonics = loud + piercing (a real pea whistle, not a sine).
  const o1 = c.createOscillator()
  o1.type = 'sawtooth'
  o1.frequency.value = 2850
  const o2 = c.createOscillator()
  o2.type = 'square'
  o2.frequency.value = 4275
  const o2g = c.createGain()
  o2g.gain.value = 0.35

  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 18
  const lfoGain = c.createGain()
  lfoGain.gain.value = 70
  lfo.connect(lfoGain)
  lfoGain.connect(o1.frequency)
  lfoGain.connect(o2.frequency)

  o1.connect(master)
  o2.connect(o2g)
  o2g.connect(master)

  const stopAt = when + dur + 0.03
  o1.start(when)
  o2.start(when)
  lfo.start(when)
  o1.stop(stopAt)
  o2.stop(stopAt)
  lfo.stop(stopAt)
}

/** Full-time signal (peep–peep–peeeep) scheduled into a context. */
function scheduleFullTime(c: BaseAudioContext, dest: AudioNode, t0: number) {
  whistleBlast(c, dest, t0 + 0.0, 0.4, 0.85)
  whistleBlast(c, dest, t0 + 0.55, 0.4, 0.85)
  whistleBlast(c, dest, t0 + 1.1, 1.0, 0.9)
}

const ALARM_LEN = 2.2 // seconds for one full-time cycle (the media element loops it)

// --- WAV encoding + media element -------------------------------------------
function bufferToWavUri(buffer: AudioBuffer): string {
  const data = buffer.getChannelData(0)
  const sr = buffer.sampleRate
  const len = data.length
  const ab = new ArrayBuffer(44 + len * 2)
  const view = new DataView(ab)
  const wstr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  wstr(0, 'RIFF')
  view.setUint32(4, 36 + len * 2, true)
  wstr(8, 'WAVE')
  wstr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sr, true)
  view.setUint32(28, sr * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  wstr(36, 'data')
  view.setUint32(40, len * 2, true)
  let off = 44
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, data[i]))
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    off += 2
  }
  const bytes = new Uint8Array(ab)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return 'data:audio/wav;base64,' + btoa(bin)
}

let alarmEl: HTMLAudioElement | null = null
let building = false

async function ensureAlarmEl(): Promise<HTMLAudioElement | null> {
  if (alarmEl || building) return alarmEl
  const AC = getAC()
  const OAC =
    (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
  if (!AC || !OAC) return null
  building = true
  try {
    const sr = 22050 // plenty for a ~3 kHz whistle; keeps the clip small
    const off = new OAC(1, Math.ceil(sr * ALARM_LEN), sr)
    scheduleFullTime(off, off.destination, 0)
    const rendered = await off.startRendering()
    const el = new Audio(bufferToWavUri(rendered))
    el.loop = true
    el.preload = 'auto'
    alarmEl = el
  } catch {
    alarmEl = null
  } finally {
    building = false
  }
  return alarmEl
}

// Start building the clip as soon as possible (no gesture needed to render).
if (typeof window !== 'undefined') void ensureAlarmEl()

/** Unlock audio from within a user gesture (Start / Test tap). */
export function primeAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
  void (async () => {
    const el = await ensureAlarmEl()
    if (!el) return
    try {
      el.muted = true
      await el.play()
      el.pause()
      el.currentTime = 0
      el.muted = false
    } catch {
      /* will unlock on the Test button instead */
    }
  })()
}

// --- Web Audio fallback loop (used only if the media element fails) ----------
let fallbackTimer: number | null = null
function startFallback() {
  const c = getCtx()
  if (!c || fallbackTimer != null) return
  if (c.state === 'suspended') void c.resume()
  const tick = () => {
    const cc = getCtx()
    if (cc) scheduleFullTime(cc, cc.destination, cc.currentTime + 0.02)
  }
  tick()
  fallbackTimer = window.setInterval(tick, ALARM_LEN * 1000)
}
function stopFallback() {
  if (fallbackTimer != null) {
    window.clearInterval(fallbackTimer)
    fallbackTimer = null
  }
}

/** Start the repeating full-time whistle; loops until stopAlarm(). */
export function startAlarm(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
  if (alarmEl) {
    alarmEl.loop = true
    alarmEl.muted = false
    alarmEl.volume = 1
    alarmEl.currentTime = 0
    alarmEl.play().catch(() => startFallback())
  } else {
    startFallback()
  }
}

/** Stop the alarm. */
export function stopAlarm(): void {
  if (alarmEl) {
    alarmEl.pause()
    try {
      alarmEl.currentTime = 0
    } catch {
      /* ignore */
    }
  }
  stopFallback()
}

/** Short whistle blip at an auto-repeat round transition. */
export function playRoundWhistle(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
  if (alarmEl) {
    alarmEl.loop = false
    alarmEl.muted = false
    alarmEl.currentTime = 0
    alarmEl.play().catch(() => {})
    window.setTimeout(() => {
      if (alarmEl && !alarmEl.loop) alarmEl.pause()
    }, 900)
  } else {
    const cc = getCtx()
    if (cc) whistleBlast(cc, cc.destination, cc.currentTime + 0.02, 0.4, 0.85)
  }
}

/** Play the alarm briefly so the user can confirm it's audible (and unlock it). */
export function testAlarm(): void {
  primeAudio()
  startAlarm()
  window.setTimeout(stopAlarm, 2600)
}
