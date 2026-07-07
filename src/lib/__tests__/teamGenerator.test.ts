import { describe, it, expect } from 'vitest'
import { fisherYatesShuffle, generateTeams, previewTeamSizes } from '../teamGenerator'

/** Deterministic RNG (mulberry32) so shuffles are reproducible in tests. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const players19 = Array.from({ length: 19 }, (_, i) => `P${i + 1}`)

describe('generateTeams — sequential fill (CRITICAL)', () => {
  it('splits 19 players / target 7 / 3 teams as [7, 7, 5]', () => {
    const teams = generateTeams(players19, 3, 7, seeded(42))
    expect(teams.map((t) => t.players.length)).toEqual([7, 7, 5])
  })

  it('assigns colors White, Black, Red in order', () => {
    const teams = generateTeams(players19, 3, 7, seeded(1))
    expect(teams.map((t) => t.color.name)).toEqual(['White', 'Black', 'Red'])
  })

  it('keeps every player exactly once (permutation of input)', () => {
    const teams = generateTeams(players19, 3, 7, seeded(7))
    const all = teams.flatMap((t) => t.players)
    expect(all).toHaveLength(19)
    expect(new Set(all)).toEqual(new Set(players19))
  })

  it('dumps overflow into the final team', () => {
    const players25 = Array.from({ length: 25 }, (_, i) => `P${i}`)
    const teams = generateTeams(players25, 3, 7, seeded(3))
    expect(teams.map((t) => t.players.length)).toEqual([7, 7, 11])
  })

  it('fills an exact roster evenly', () => {
    const players21 = Array.from({ length: 21 }, (_, i) => `P${i}`)
    const teams = generateTeams(players21, 3, 7, seeded(11))
    expect(teams.map((t) => t.players.length)).toEqual([7, 7, 7])
  })
})

describe('previewTeamSizes', () => {
  it('matches the generator split without shuffling', () => {
    expect(previewTeamSizes(19, 3, 7)).toEqual([7, 7, 5])
    expect(previewTeamSizes(21, 3, 7)).toEqual([7, 7, 7])
    expect(previewTeamSizes(10, 3, 7)).toEqual([7, 3, 0])
  })
})

describe('fisherYatesShuffle', () => {
  it('preserves the multiset and length', () => {
    const out = fisherYatesShuffle(players19, seeded(9))
    expect(out).toHaveLength(19)
    expect(new Set(out)).toEqual(new Set(players19))
  })
})
