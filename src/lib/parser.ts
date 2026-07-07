/**
 * Robust WhatsApp roster parser.
 *
 * WhatsApp copy/paste is notoriously messy: it wraps timestamps and names in
 * invisible directional/formatting characters, and organizers mix player names
 * with date/time/location header lines. This extracts a clean, ordered list of
 * player names.
 */

/**
 * Invisible / zero-width formatting characters WhatsApp likes to inject:
 * ZWSP (U+200B), ZWNJ (U+200C), ZWJ (U+200D), LRM (U+200E), RLM (U+200F),
 * word joiner (U+2060), BOM/ZWNBSP (U+FEFF), soft hyphen (U+00AD), Mongolian
 * vowel separator (U+180E), and line/paragraph separators (U+2028/U+2029).
 * Written as \\u escapes because U+2028/U+2029 are JS source line terminators.
 */
const HIDDEN_CHARS =
  /[\u200B\u200C\u200D\u200E\u200F\u2060\uFEFF\u00AD\u180E\u2028\u2029]/g

/** Non-breaking space (U+00A0) -> normal space (so it trims/collapses normally). */
const NBSP = /\u00A0/g

/**
 * A player line starts with a number followed by a period OR a parenthesis,
 * e.g. "1. Alice", "12) Bob". Deliberately NOT a dash — that keeps header
 * lines like "8-9pm" from being mistaken for "player 8 named 9pm".
 */
const NUMBERED_LINE = /^\s*\d+\s*[.)]\s*(.+)$/

/** Leftover bullets / punctuation to trim off the front of an extracted name. */
const LEADING_JUNK = /^[\s.)\-–—:*•·]+/
/** Collapse runs of whitespace inside a name. */
const INNER_WHITESPACE = /\s{2,}/g

/**
 * Parse a raw WhatsApp message into a clean, ordered array of player names.
 *
 * Steps (per spec):
 *  1. Strip all hidden/zero-width formatting characters.
 *  2. Keep only lines that start with a number + period/parenthesis. Header
 *     lines (dates, times, locations like "09 July 2026" or "8-9pm") don't
 *     match this shape, so they're excluded automatically.
 *  3. Strip the leading number + punctuation + surrounding whitespace.
 *  4. Return the remaining names, in order.
 */
export function parsePlayers(raw: string): string[] {
  if (!raw) return []

  const cleaned = raw.replace(HIDDEN_CHARS, '').replace(NBSP, ' ')
  const players: string[] = []

  for (const line of cleaned.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = NUMBERED_LINE.exec(trimmed)
    if (!match) continue // not a numbered line => header / noise, skip it

    const name = match[1]
      .replace(LEADING_JUNK, '')
      .replace(INNER_WHITESPACE, ' ')
      .trim()

    if (name) players.push(name)
  }

  return players
}
