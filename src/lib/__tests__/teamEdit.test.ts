import { describe, it, expect } from 'vitest'
import { swapPlayers, movePlayer } from '../teamEdit'
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
