import { describe, it, expect } from 'vitest'
import { swapPlayers, movePlayer, swapToTeamBalanced } from '../teamEdit'
import { generateTeams } from '../teamGenerator'
import type { Team } from '../../types'

function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const base = (): Team[] =>
  generateTeams(
    Array.from({ length: 19 }, (_, i) => `P${i + 1}`),
    3,
    7,
    seeded(5),
  )

describe('swapPlayers', () => {
  it('exchanges two players across teams and preserves sizes', () => {
    const teams = base()
    const a = teams[0].players[0]
    const b = teams[2].players[0]
    const next = swapPlayers(teams, 0, 0, 2, 0)
    expect(next[0].players[0]).toBe(b)
    expect(next[2].players[0]).toBe(a)
    expect(next.map((t) => t.players.length)).toEqual([7, 7, 5])
  })

  it('does not mutate the input', () => {
    const teams = base()
    const snapshot = teams.map((t) => [...t.players])
    swapPlayers(teams, 0, 1, 1, 2)
    expect(teams.map((t) => t.players)).toEqual(snapshot)
  })

  it('keeps the overall multiset of players intact', () => {
    const teams = base()
    const before = teams.flatMap((t) => t.players).sort()
    const next = swapPlayers(teams, 0, 3, 1, 4)
    expect(next.flatMap((t) => t.players).sort()).toEqual(before)
  })
})

describe('movePlayer', () => {
  it('moves a player to another team and adjusts sizes', () => {
    const teams = base()
    const moved = teams[0].players[2]
    const next = movePlayer(teams, 0, 2, 2)
    expect(next.map((t) => t.players.length)).toEqual([6, 7, 6])
    expect(next[2].players).toContain(moved)
    expect(next[0].players).not.toContain(moved)
  })

  it('is a no-op when source and target are the same team', () => {
    const teams = base()
    expect(movePlayer(teams, 1, 0, 1)).toBe(teams)
  })

  it('does not mutate the input', () => {
    const teams = base()
    const snapshot = teams.map((t) => [...t.players])
    movePlayer(teams, 0, 0, 1)
    expect(teams.map((t) => t.players)).toEqual(snapshot)
  })
})

describe('swapToTeamBalanced', () => {
  // Two 3-player teams with controlled ratings.
  const ratings: Record<string, number> = { A: 5, B: 4, C: 1, D: 1, E: 4, F: 3 }
  const ratingOf = (n: string) => ratings[n] ?? 2
  const twoTeams = (): Team[] => {
    const t = generateTeams(['a', 'b', 'c', 'd', 'e', 'f'], 2, 3, seeded(1))
    t[0] = { ...t[0], players: ['A', 'B', 'C'], starters: 3 }
    t[1] = { ...t[1], players: ['D', 'E', 'F'], starters: 3 }
    return t
  }

  it('swaps with the closest-rated player on the target team', () => {
    const teams = twoTeams()
    // Move A (5) to team 1; closest rating there is E (4), not D(1)/F(3).
    const next = swapToTeamBalanced(teams, 0, 0, 1, ratingOf)
    expect(next[0].players).toEqual(['E', 'B', 'C'])
    expect(next[1].players).toEqual(['D', 'A', 'F'])
    expect(next.map((t) => t.players.length)).toEqual([3, 3]) // sizes preserved
  })

  it('minimises the change to each team’s total strength', () => {
    const teams = twoTeams()
    const strength = (t: Team) => t.players.reduce((s, p) => s + ratingOf(p), 0)
    const before = teams.map(strength)
    const after = swapToTeamBalanced(teams, 0, 0, 1, ratingOf).map(strength)
    // A(5) <-> E(4): each side moves by just 1 point.
    expect(Math.abs(after[0] - before[0])).toBe(1)
    expect(Math.abs(after[1] - before[1])).toBe(1)
  })

  it('does not mutate the input', () => {
    const teams = twoTeams()
    const snapshot = teams.map((t) => [...t.players])
    swapToTeamBalanced(teams, 0, 0, 1, ratingOf)
    expect(teams.map((t) => t.players)).toEqual(snapshot)
  })

  it('is a no-op when target is the same team', () => {
    const teams = twoTeams()
    expect(swapToTeamBalanced(teams, 0, 0, 0, ratingOf)).toBe(teams)
  })

  it('falls back to a plain move when the target team is empty', () => {
    const teams = twoTeams()
    teams[1] = { ...teams[1], players: [], starters: 0 }
    const next = swapToTeamBalanced(teams, 0, 0, 1, ratingOf)
    expect(next.map((t) => t.players.length)).toEqual([2, 1])
    expect(next[1].players).toEqual(['A'])
  })
})
