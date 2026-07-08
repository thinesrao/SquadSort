import { describe, it, expect } from 'vitest'
import { generateBalancedTeams } from '../teamGenerator'

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 19 players: 6 top (3★), 7 average (2★), 6 beginners (1★).
const players = Array.from({ length: 19 }, (_, i) => `P${i + 1}`)
const ratings: Record<string, number> = {}
players.forEach((p, i) => {
  ratings[p] = i < 6 ? 3 : i < 13 ? 2 : 1
})
const ratingOf = (n: string) => ratings[n] ?? 2

describe('generateBalancedTeams', () => {
  it('respects the sequential-fill target sizes (7-7-5)', () => {
    const teams = generateBalancedTeams(players, ratingOf, 3, 7, seeded(1))
    expect(teams.map((t) => t.players.length)).toEqual([7, 7, 5])
  })

  it('keeps every player exactly once', () => {
    const teams = generateBalancedTeams(players, ratingOf, 3, 7, seeded(2))
    expect(new Set(teams.flatMap((t) => t.players))).toEqual(new Set(players))
  })

  // The key anti-"Group of Death" guarantee: top players never pile onto one
  // team. (Perfect evenness of the *lowest* tier isn't guaranteed because the
  // smaller team fills on higher tiers first — the size rule wins.)
  it('spreads the top-tier (3★) players evenly across teams (diff ≤ 1)', () => {
    for (const seed of [3, 17, 42, 99]) {
      const teams = generateBalancedTeams(players, ratingOf, 3, 7, seeded(seed))
      const topPerTeam = teams.map((t) => t.players.filter((p) => ratings[p] === 3).length)
      expect(Math.max(...topPerTeam) - Math.min(...topPerTeam)).toBeLessThanOrEqual(1)
    }
  })

  it('never concentrates all top players on a single team', () => {
    const teams = generateBalancedTeams(players, ratingOf, 3, 7, seeded(4))
    const topPerTeam = teams.map((t) => t.players.filter((p) => ratings[p] === 3).length)
    expect(Math.max(...topPerTeam)).toBeLessThan(6) // 6 total 3★ players
  })
})
