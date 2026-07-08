import { describe, it, expect } from 'vitest'
import { buildTeams } from '../teamGenerator'

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

describe('buildTeams — goalkeepers', () => {
  it('gives each team exactly one keeper when there are enough', () => {
    const gks = new Set(['P1', 'P2', 'P3'])
    const { teams, warnings } = buildTeams(roster(21), {
      teamCount: 3,
      targetSize: 7,
      rollingSubs: false,
      isGk: (n) => gks.has(n),
      rng: seeded(1),
    })
    const gkPerTeam = teams.map((t) => t.players.filter((p) => gks.has(p)).length)
    expect(gkPerTeam).toEqual([1, 1, 1])
    expect(teams.map((t) => t.players.length)).toEqual([7, 7, 7])
    expect(warnings).toHaveLength(0)
  })

  it('warns when there are fewer keepers than teams', () => {
    const gks = new Set(['P1'])
    const { warnings } = buildTeams(roster(21), {
      teamCount: 3,
      targetSize: 7,
      rollingSubs: false,
      isGk: (n) => gks.has(n),
      rng: seeded(2),
    })
    expect(warnings.some((w) => /keeper/i.test(w))).toBe(true)
  })
})

describe('buildTeams — constraints', () => {
  it('keeps a pair together', () => {
    const { teams } = buildTeams(roster(21), {
      teamCount: 3,
      targetSize: 7,
      rollingSubs: false,
      keepTogether: [['P1', 'P2']],
      rng: seeded(3),
    })
    const t1 = teams.findIndex((t) => t.players.includes('P1'))
    const t2 = teams.findIndex((t) => t.players.includes('P2'))
    expect(t1).toBe(t2)
  })

  it('keeps a pair apart', () => {
    const { teams } = buildTeams(roster(21), {
      teamCount: 3,
      targetSize: 7,
      rollingSubs: false,
      keepApart: [['P1', 'P2']],
      rng: seeded(4),
    })
    const t1 = teams.findIndex((t) => t.players.includes('P1'))
    const t2 = teams.findIndex((t) => t.players.includes('P2'))
    expect(t1).not.toBe(t2)
  })

  it('preserves sizes and the full roster with GK + constraints combined', () => {
    const gks = new Set(['P1', 'P8'])
    const { teams } = buildTeams(roster(18), {
      teamCount: 2,
      targetSize: 7,
      rollingSubs: true,
      isGk: (n) => gks.has(n),
      keepTogether: [['P3', 'P4']],
      keepApart: [['P5', 'P6']],
      rng: seeded(5),
    })
    expect(teams.map((t) => t.players.length)).toEqual([9, 9])
    expect(new Set(teams.flatMap((t) => t.players)).size).toBe(18)
    expect(teams.map((t) => t.starters)).toEqual([7, 7])
  })
})
