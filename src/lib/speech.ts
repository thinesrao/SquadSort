/** Speak a short phrase via the Web Speech API (pitch-side matchup calls). */
export function speak(text: string): void {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 1
    u.volume = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* unsupported — ignore */
  }
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}
