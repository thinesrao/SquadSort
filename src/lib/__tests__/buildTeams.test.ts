import { describe, it, expect } from 'vitest'
import { buildTeams, pairStreaks } from '../teamGenerator'
import type { LineupRecord } from '../../types'

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

  it('keepApart survives kit-avoidance pass', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { teams } = buildTeams(roster(14), {
        teamCount: 2,
        targetSize: 7,
        rollingSubs: false,
        keepApart: [['P1', 'P2']],
        kitAvoid: { P1: ['white'] },
        rng: seeded(seed),
      })
      const t1 = teams.findIndex((t) => t.players.includes('P1'))
      const t2 = teams.findIndex((t) => t.players.includes('P2'))
      expect(t1).not.toBe(t2)
    }
  })

  it('keepTogether survives team-history pass', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { teams } = buildTeams(roster(14), {
        teamCount: 2,
        targetSize: 7,
        rollingSubs: false,
        keepTogether: [['P1', 'P2']],
        teamHistory: { P1: ['white'], P2: ['white'] },
        rng: seeded(seed),
      })
      const t1 = teams.findIndex((t) => t.players.includes('P1'))
      const t2 = teams.findIndex((t) => t.players.includes('P2'))
      expect(t1).toBe(t2)
    }
  })

  it('warns when kitAvoid + keepApart are unsatisfiable', () => {
    const { warnings } = buildTeams(roster(14), {
      teamCount: 2,
      targetSize: 7,
      rollingSubs: false,
      keepApart: [['P1', 'P2']],
      kitAvoid: { P1: ['white', 'black'], P2: ['white', 'black'] },
      rng: seeded(1),
    })
    const hasKitWarn = warnings.some((w) => /can't avoid/i.test(w))
    const hasPairWarn = warnings.some((w) => /couldn't keep/i.test(w))
    expect(hasKitWarn || hasPairWarn).toBe(true)
  })
})

describe('pairStreaks', () => {
  const rec = (teams: string[][]): LineupRecord => ({
    confirmedAt: new Date().toISOString(),
    teams,
  })

  it('returns empty map for empty history', () => {
    const result = pairStreaks([], new Set(['A', 'B']))
    expect(result.size).toBe(0)
  })

  it('computes sameStreak=1 for a single record', () => {
    const history = [rec([['A', 'B'], ['C', 'D']])]
    const result = pairStreaks(history, new Set(['A', 'B', 'C', 'D']))
    expect(result.get('A|B')?.sameStreak).toBe(1)
    expect(result.get('C|D')?.sameStreak).toBe(1)
    expect(result.get('A|C')?.apartStreak).toBe(1)
  })

  it('computes sameStreak=2 when pair is on the same team twice in a row', () => {
    const history = [
      rec([['A', 'B'], ['C', 'D']]),
      rec([['A', 'B'], ['C', 'D']]),
    ]
    const result = pairStreaks(history, new Set(['A', 'B', 'C', 'D']))
    expect(result.get('A|B')?.sameStreak).toBe(2)
  })

  it('computes apartStreak=2 when pair is apart twice in a row', () => {
    const history = [
      rec([['A', 'C'], ['B', 'D']]),
      rec([['A', 'D'], ['B', 'C']]),
    ]
    const result = pairStreaks(history, new Set(['A', 'B', 'C', 'D']))
    expect(result.get('A|B')?.apartStreak).toBe(2)
  })

  it('ignores players not in the active set', () => {
    const history = [rec([['A', 'B'], ['C', 'D']])]
    const result = pairStreaks(history, new Set(['A', 'C']))
    expect(result.has('A|B')).toBe(false)
    expect(result.get('A|C')?.apartStreak).toBe(1)
  })

  it('stops streak when player is absent from a record', () => {
    const history = [
      rec([['A', 'B'], ['C']]),
      rec([['A'], ['B', 'C']]),
    ]
    const result = pairStreaks(history, new Set(['A', 'B', 'C']))
    expect(result.get('A|B')?.sameStreak).toBe(1)
  })
})

describe('buildTeams — staleness repair (lineupHistory)', () => {
  it('tends to split a pair that was on the same team 2x in a row', () => {
    // Use "ghost" players (X1-X12) not in the current roster so only P1+P2 have a streak
    const history: LineupRecord[] = [
      { confirmedAt: '2026-01-01', teams: [['P1', 'P2', 'X1', 'X2', 'X3', 'X4', 'X5'], ['X6', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12']] },
      { confirmedAt: '2026-01-02', teams: [['P1', 'P2', 'X1', 'X2', 'X3', 'X4', 'X5'], ['X6', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12']] },
    ]
    let splitCount = 0
    for (let seed = 1; seed <= 40; seed++) {
      const { teams } = buildTeams(roster(14), {
        teamCount: 2,
        targetSize: 7,
        rollingSubs: false,
        lineupHistory: history,
        rng: seeded(seed),
      })
      const t1 = teams.findIndex((t) => t.players.includes('P1'))
      const t2 = teams.findIndex((t) => t.players.includes('P2'))
      if (t1 !== t2) splitCount++
    }
    // Base rate ~50%. With only one split target, repair should succeed most of the time.
    expect(splitCount).toBeGreaterThan(25)
  })

  it('tends to unite a pair that was apart 3x in a row', () => {
    // Use "ghost" players so only P1+P2 have an apart streak
    const history: LineupRecord[] = [
      { confirmedAt: '2026-01-01', teams: [['P1', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6'], ['P2', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12']] },
      { confirmedAt: '2026-01-02', teams: [['P1', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6'], ['P2', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12']] },
      { confirmedAt: '2026-01-03', teams: [['P1', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6'], ['P2', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12']] },
    ]
    let unitedCount = 0
    for (let seed = 1; seed <= 40; seed++) {
      const { teams } = buildTeams(roster(14), {
        teamCount: 2,
        targetSize: 7,
        rollingSubs: false,
        lineupHistory: history,
        rng: seeded(seed),
      })
      const t1 = teams.findIndex((t) => t.players.includes('P1'))
      const t2 = teams.findIndex((t) => t.players.includes('P2'))
      if (t1 === t2) unitedCount++
    }
    // Base rate ~50%. With only one unite target, repair should succeed most of the time.
    expect(unitedCount).toBeGreaterThan(25)
  })

  it('falls back to legacy color-based behavior when lineupHistory is empty', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { teams } = buildTeams(roster(14), {
        teamCount: 2,
        targetSize: 7,
        rollingSubs: false,
        keepTogether: [['P1', 'P2']],
        teamHistory: { P1: ['white'], P2: ['white'] },
        lineupHistory: [],
        rng: seeded(seed),
      })
      const t1 = teams.findIndex((t) => t.players.includes('P1'))
      const t2 = teams.findIndex((t) => t.players.includes('P2'))
      expect(t1).toBe(t2)
    }
  })
})
