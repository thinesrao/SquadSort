import { describe, it, expect } from 'vitest'
import { generateTeams } from '../teamGenerator'
import { generateSchedule, extendSchedule } from '../schedule'
import { borrowLabel, matchTitle, restingLabel } from '../format'
import type { Match, Team } from '../../types'

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 19 players / target 7 / 3 teams -> [7, 7, 5]; the Red team is 2 short.
const teams3 = generateTeams(
  Array.from({ length: 19 }, (_, i) => `P${i + 1}`),
  3,
  7,
  seeded(5),
)

describe('generateSchedule — 3-team borrow (spec-exact)', () => {
  const schedule = generateSchedule(teams3, 7)

  it('produces 3 matches in the exact spec order/orientation', () => {
    expect(schedule.map((m) => matchTitle(m, teams3))).toEqual([
      'White vs Black',
      'Black vs Red',
      'Red vs White',
    ])
  })

  it('rests the correct team each match', () => {
    expect(schedule.map((m) => restingLabel(m, teams3))).toEqual([
      'Red rests',
      'White rests',
      'Black rests',
    ])
  })

  it('annotates borrows only when the short team plays', () => {
    expect(borrowLabel(schedule[0], teams3)).toBeNull()
    expect(borrowLabel(schedule[1], teams3)).toBe(
      'Team Red borrows 2 players from Team White',
    )
    expect(borrowLabel(schedule[2], teams3)).toBe(
      'Team Red borrows 2 players from Team Black',
    )
  })
})

describe('generateSchedule — other team counts', () => {
  it('is a single match with no borrow note for 2 teams (even split)', () => {
    const teams2 = generateTeams(
      Array.from({ length: 14 }, (_, i) => `P${i}`),
      2,
      7,
      seeded(2),
    )
    const s = generateSchedule(teams2, 7)
    expect(s).toHaveLength(1)
    expect(matchTitle(s[0], teams2)).toBe('White vs Black')
    expect(borrowLabel(s[0], teams2)).toBeNull()
  })

  it('produces a fair 12-game rotation for 4 teams (no VIP pivot)', () => {
    const teams4 = generateTeams(
      Array.from({ length: 28 }, (_, i) => `P${i}`),
      4,
      7,
      seeded(4),
    )
    const s = generateSchedule(teams4, 7)
    expect(s).toHaveLength(12)
    // every match has exactly 2 resting teams
    expect(s.every((m) => m.resting.length === 2)).toBe(true)

    // Circular fairness: over the looping schedule no team plays or rests 3
    // in a row, every team plays the same number of games, and — the point of
    // the fix — no team gets the "rest one / play one" VIP alternation.
    for (const t of teams4) {
      const playing = s.map((m) => m.home === t.id || m.away === t.id)
      expect(circularLongestRun(playing, true)).toBeLessThanOrEqual(2)
      expect(circularLongestRun(playing, false)).toBeLessThanOrEqual(2)
      expect(playing.filter(Boolean)).toHaveLength(6) // equal playing time
      const perfectlyAlternates =
        circularLongestRun(playing, true) === 1 && circularLongestRun(playing, false) === 1
      expect(perfectlyAlternates).toBe(false)
    }

    // Every matchup exactly twice.
    const counts = new Map<string, number>()
    for (const m of s) {
      const key = [m.home, m.away].sort((a, b) => a - b).join('-')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    expect([...counts.values()].every((c) => c === 2)).toBe(true)

    // Back-to-backs are shared perfectly evenly (one each).
    const b2b = teams4.map((t) => {
      const playing = s.map((m) => m.home === t.id || m.away === t.id)
      let c = 0
      for (let k = 0; k < playing.length; k++) {
        if (playing[k] && playing[(k + 1) % playing.length]) c++
      }
      return c
    })
    expect(b2b).toEqual([1, 1, 1, 1])
  })
})

// Longest run of `true`/`false` in a boolean sequence.
function longestRun(seq: boolean[], value: boolean): number {
  let best = 0
  let cur = 0
  for (const v of seq) {
    cur = v === value ? cur + 1 : 0
    if (cur > best) best = cur
  }
  return best
}

// Longest run treating the sequence as a loop (the timer cycles it).
function circularLongestRun(seq: boolean[], value: boolean): number {
  const n = seq.length
  if (n === 0) return 0
  if (seq.every((v) => v === value)) return n
  let best = 0
  let cur = 0
  for (let i = 0; i < 2 * n; i++) {
    if (seq[i % n] === value) {
      cur++
      best = Math.max(best, cur)
    } else {
      cur = 0
    }
  }
  return best
}

describe('extendSchedule', () => {
  const base: Match[] = [
    { index: 1, home: 0, away: 1, resting: [2] },
    { index: 2, home: 1, away: 2, resting: [0] },
    { index: 3, home: 2, away: 0, resting: [1] },
  ]

  it('returns an empty list for an empty base', () => {
    expect(extendSchedule([], 10)).toEqual([])
  })

  it('repeats whole cycles to reach at least minGames and re-numbers 1..N', () => {
    const out = extendSchedule(base, 7) // ceil(7/3) = 3 cycles -> 9 games
    expect(out).toHaveLength(9)
    expect(out.map((m) => m.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    // fixtures cycle: game 4 == game 1's matchup, etc.
    expect(out[3].home).toBe(base[0].home)
    expect(out[3].away).toBe(base[0].away)
  })

  it('keeps at least one full cycle even when minGames is small', () => {
    expect(extendSchedule(base, 1)).toHaveLength(3)
  })

  // Directly answers the "4-team rotation fairness" concern: extending the
  // circle-method round-robin by whole cycles must never make a team play or
  // rest 3 games in a row, and every matchup must appear an equal number of
  // times.
  it('gives a fair 4-team rotation (no 3-in-a-row, matchups equal)', () => {
    const teams4: Team[] = generateTeams(
      Array.from({ length: 28 }, (_, i) => `P${i}`),
      4,
      7,
      seeded(9),
    )
    const full = extendSchedule(generateSchedule(teams4, 7), 12) // two full cycles
    expect(full).toHaveLength(12)

    for (const t of teams4) {
      const playing = full.map((m) => m.home === t.id || m.away === t.id)
      expect(longestRun(playing, true)).toBeLessThanOrEqual(2) // never 3 games straight
      expect(longestRun(playing, false)).toBeLessThanOrEqual(2) // never rests 3 straight
      expect(playing.some((p) => p)).toBe(true)
    }

    // All 6 matchups occur, each the same number of times (here, twice).
    const counts = new Map<string, number>()
    for (const m of full) {
      const key = [m.home, m.away].sort((a, b) => a - b).join('-')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    expect(counts.size).toBe(6)
    expect([...counts.values()].every((c) => c === 2)).toBe(true)
  })
})
