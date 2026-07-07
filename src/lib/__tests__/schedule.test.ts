import { describe, it, expect } from 'vitest'
import { generateTeams } from '../teamGenerator'
import { generateSchedule } from '../schedule'
import { borrowLabel, matchTitle, restingLabel } from '../format'

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

  it('produces a full round-robin (6 matches) for 4 teams', () => {
    const teams4 = generateTeams(
      Array.from({ length: 26 }, (_, i) => `P${i}`),
      4,
      7,
      seeded(4),
    )
    const s = generateSchedule(teams4, 7)
    expect(s).toHaveLength(6)
    // every match has exactly 2 resting teams
    expect(s.every((m) => m.resting.length === 2)).toBe(true)
  })
})
