import type { BorrowNote, Match, Team } from '../types'

/**
 * The "borrow / rolling sub" scheduling system.
 *
 * By construction of the sequential-fill algorithm, only the FINAL team can be
 * short of the target size. When that short team plays, it borrows the missing
 * players from a team that is resting that round.
 *
 * For the default 3-team round-robin the output is exactly:
 *   Match 1: A vs B  (C rests)
 *   Match 2: B vs C  (A rests)   -> "C borrows N from A"
 *   Match 3: C vs A  (B rests)   -> "C borrows N from B"
 */

interface Shortage {
  teamId: number
  deficit: number
}

function shortageOf(teams: Team[], targetSize: number): Shortage {
  const last = teams[teams.length - 1]
  return { teamId: last.id, deficit: Math.max(0, targetSize - last.players.length) }
}

function borrowFor(
  home: number,
  away: number,
  resting: number[],
  shortage: Shortage,
): BorrowNote | undefined {
  if (shortage.deficit <= 0) return undefined
  const shortIsPlaying = home === shortage.teamId || away === shortage.teamId
  if (!shortIsPlaying) return undefined
  if (resting.length === 0) return undefined // no bench to borrow from
  return {
    borrowerTeamId: shortage.teamId,
    fromTeamId: resting[0],
    count: shortage.deficit,
  }
}

/**
 * Circle-method single round-robin: every team plays every other exactly once.
 * A dummy (-1) is added for odd team counts; whoever is paired with it byes.
 * Returns a flat, one-pitch-at-a-time list of [home, away] pairs.
 */
function roundRobinPairs(n: number): Array<[number, number]> {
  const slots: number[] = Array.from({ length: n }, (_, i) => i)
  if (n % 2 === 1) slots.push(-1)
  const m = slots.length

  const pairs: Array<[number, number]> = []
  const arr = [...slots]
  for (let round = 0; round < m - 1; round++) {
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i]
      const b = arr[m - 1 - i]
      if (a !== -1 && b !== -1) pairs.push([a, b])
    }
    // Rotate everything except the first slot.
    const rest = arr.slice(1)
    rest.unshift(rest.pop() as number)
    arr.splice(1, arr.length - 1, ...rest)
  }
  return pairs
}

export function generateSchedule(teams: Team[], targetSize: number): Match[] {
  const n = teams.length
  if (n < 2) return []

  const shortage = shortageOf(teams, targetSize)
  const allIds = teams.map((t) => t.id)

  const build = (pairs: Array<[number, number]>): Match[] =>
    pairs.map(([home, away], i) => {
      const resting = allIds.filter((id) => id !== home && id !== away)
      const borrow = borrowFor(home, away, resting, shortage)
      const note =
        !borrow && n === 2 && shortage.deficit > 0
          ? `${teams[shortage.teamId].color.name} is ${shortage.deficit} short — no bench to borrow from.`
          : undefined
      return { index: i + 1, home, away, resting, borrow, note }
    })

  // Two teams: a single match, no bench.
  if (n === 2) return build([[0, 1]])

  // Three teams: emit the spec-exact order and orientation.
  if (n === 3) {
    return build([
      [0, 1], // A vs B (C rests)
      [1, 2], // B vs C (A rests) -> C borrows from A
      [2, 0], // C vs A (B rests) -> C borrows from B
    ])
  }

  // Four or more teams: full single round-robin, one match at a time.
  return build(roundRobinPairs(n))
}

/**
 * Repeat a base fixture list into a longer running order for a full session.
 *
 * A round-robin base is only 1–6 fixtures, but a one-hour session plays many
 * more games than that — the teams simply cycle through the same fixtures
 * again. `extendSchedule` lays out enough whole cycles to reach at least
 * `minGames`, re-numbering the games 1..N (borrow/rest notes are carried over
 * unchanged since the fixtures repeat exactly).
 */
export function extendSchedule(base: Match[], minGames = 6): Match[] {
  if (base.length === 0) return []
  const cycles = Math.max(1, Math.ceil(minGames / base.length))
  const out: Match[] = []
  for (let c = 0; c < cycles; c++) {
    for (const m of base) out.push({ ...m, index: out.length + 1 })
  }
  return out
}
