import { describe, it, expect } from 'vitest'
import { parsePlayers } from '../parser'

describe('parsePlayers', () => {
  it('extracts names from a numbered list and ignores non-numbered headers', () => {
    const raw = [
      '⚽ Futsal — 09 July 2026',
      '8-9pm @ The Cage',
      'Reply below 👇',
      '',
      '1. Danny',
      '2) Marcus',
      '3.  Leo',
      '12) Sanjay',
    ].join('\n')
    expect(parsePlayers(raw)).toEqual(['Danny', 'Marcus', 'Leo', 'Sanjay'])
  })

  it('strips zero-width / hidden WhatsApp formatting characters', () => {
    // word joiner (U+2060), ZWSP (U+200B), LRM (U+200E), BOM (U+FEFF),
    // soft hyphen (U+00AD), and a trailing NBSP (U+00A0).
    const raw = '1.⁠ Da​nny‎\n2. ﻿Mar­cus '
    expect(parsePlayers(raw)).toEqual(['Danny', 'Marcus'])
  })

  it('ignores date / time / location header lines', () => {
    const raw = '09 July 2026\n8-9pm\nThe Cage\n1. Danny'
    expect(parsePlayers(raw)).toEqual(['Danny'])
  })

  it('keeps names that contain extra tokens (e.g. guests)', () => {
    expect(parsePlayers('1. John +1\n2. Amy (GK)')).toEqual(['John +1', 'Amy (GK)'])
  })

  it('returns an empty array for blank / whitespace input', () => {
    expect(parsePlayers('')).toEqual([])
    expect(parsePlayers('   \n\n  ')).toEqual([])
  })
})
