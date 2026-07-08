import { describe, it, expect } from 'vitest'
import {
  generateEvenTeams,
  rollingSubSizes,
  recommendedTeamCount,
} from '../teamGenerator'

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const roster = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`)

describe('rollingSubSizes', () => {
  it('spreads the surplus evenly (18 / 2 / 7 -> [9,9])', () => {
    expect(rollingSubSizes(18, 2, 7)).toEqual([9, 9])
  })
  it('handles an uneven surplus (22 / 3 / 7 -> [8,7,7])', () => {
    expect(rollingSubSizes(22, 3, 7)).toEqual([8, 7, 7])
  })
  it('is null when there is no surplus (falls back to sequential split)', () => {
    expect(rollingSubSizes(19, 3, 7)).toBeNull()
    expect(rollingSubSizes(14, 2, 7)).toBeNull() // exactly full, no subs
    expect(rollingSubSizes(10, 2, 7)).toBeNull()
  })
})

describe('generateEvenTeams (rolling subs)', () => {
  it('splits 18 into 9-9 with 7 starters + 2 subs each', () => {
    const teams = generateEvenTeams(roster(18), 2, 7, null, seeded(1))
    expect(teams.map((t) => t.players.length)).toEqual([9, 9])
    expect(teams.map((t) => t.starters)).toEqual([7, 7])
    expect(new Set(teams.flatMap((t) => t.players)).size).toBe(18)
  })

  it('falls back to the sequential 7-7-5 borrow split when short (19 / 3)', () => {
    const teams = generateEvenTeams(roster(19), 3, 7, null, seeded(2))
    expect(teams.map((t) => t.players.length)).toEqual([7, 7, 5])
    // no surplus -> everyone is a starter (short team borrows instead)
    expect(teams.map((t) => t.starters)).toEqual([7, 7, 5])
  })

  it('balances by skill when a rating fn is supplied, still even', () => {
    const r: Record<string, number> = {}
    roster(18).forEach((p, i) => (r[p] = i < 6 ? 3 : 2))
    const teams = generateEvenTeams(roster(18), 2, 7, (n) => r[n] ?? 2, seeded(3))
    expect(teams.map((t) => t.players.length)).toEqual([9, 9])
    const topPerTeam = teams.map((t) => t.players.filter((p) => r[p] === 3).length)
    expect(Math.max(...topPerTeam) - Math.min(...topPerTeam)).toBeLessThanOrEqual(1)
  })
})

describe('recommendedTeamCount', () => {
  it('follows the game rule (<=18 -> 2, >=19 -> 3)', () => {
    expect(recommendedTeamCount(14)).toBe(2)
    expect(recommendedTeamCount(18)).toBe(2)
    expect(recommendedTeamCount(19)).toBe(3)
    expect(recommendedTeamCount(24)).toBe(3)
  })
})
