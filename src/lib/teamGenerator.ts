import type { Player, Team } from '../types'
import { colorForIndex } from '../constants'

/**
 * Unbiased in-place Fisher–Yates shuffle over a copy of the input.
 * An RNG can be injected for deterministic tests; defaults to Math.random.
 */
export function fisherYatesShuffle<T>(
  input: readonly T[],
  rng: () => number = Math.random,
): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

export type RatingFn = (name: string) => number

/** Order players strongest-first, shuffled within each 3/2/1-star tier. */
function tieredOrder(players: Player[], ratingOf: RatingFn, rng: () => number): Player[] {
  const buckets: Record<1 | 2 | 3, Player[]> = { 1: [], 2: [], 3: [] }
  for (const p of players) {
    const r = Math.min(3, Math.max(1, Math.round(ratingOf(p)))) as 1 | 2 | 3
    buckets[r].push(p)
  }
  return [
    ...fisherYatesShuffle(buckets[3], rng),
    ...fisherYatesShuffle(buckets[2], rng),
    ...fisherYatesShuffle(buckets[1], rng),
  ]
}

/** Snake-deal an ordered list into teams, honoring each team's capacity. */
function dealWithCaps(ordered: Player[], caps: number[]): Player[][] {
  const teamCount = caps.length
  const rosters: Player[][] = Array.from({ length: teamCount }, () => [])
  let i = 0
  let dir = 1
  const next = () => {
    const t = i
    i += dir
    if (i >= teamCount) {
      i = teamCount - 1
      dir = -1
    } else if (i < 0) {
      i = 0
      dir = 1
    }
    return t
  }
  for (const p of ordered) {
    let t = next()
    let guard = 0
    while (rosters[t].length >= caps[t] && guard++ < teamCount * 4) t = next()
    rosters[t].push(p)
  }
  return rosters
}

const toTeams = (rosters: Player[][], targetSize: number, allStarters: boolean): Team[] =>
  rosters.map((pl, idx) => ({
    id: idx,
    color: colorForIndex(idx),
    players: pl,
    starters: allStarters ? pl.length : Math.min(targetSize, pl.length),
  }))

/**
 * CRITICAL sequential-fill algorithm.
 *
 * Fills each non-final team up to `targetSize`, then dumps the remainder into
 * the final team. Example: 19 players, targetSize 7, 3 teams -> [7, 7, 5].
 * Everyone is a starter (the short final team borrows subs mid-game).
 */
export function generateTeams(
  players: Player[],
  teamCount: number,
  targetSize: number,
  rng: () => number = Math.random,
): Team[] {
  const shuffled = fisherYatesShuffle(players, rng)
  const teams: Team[] = []
  let cursor = 0
  for (let i = 0; i < teamCount; i++) {
    const isLast = i === teamCount - 1
    const slice = isLast
      ? shuffled.slice(cursor)
      : shuffled.slice(cursor, cursor + targetSize)
    cursor += slice.length
    teams.push({ id: i, color: colorForIndex(i), players: slice, starters: slice.length })
  }
  return teams
}

/**
 * Skill-balanced sequential generation: snake-drafts strongest players evenly
 * across teams while respecting the sequential-fill sizes (balanced 7-7-5).
 */
export function generateBalancedTeams(
  players: Player[],
  ratingOf: RatingFn,
  teamCount: number,
  targetSize: number,
  rng: () => number = Math.random,
): Team[] {
  const caps = previewTeamSizes(players.length, teamCount, targetSize)
  const rosters = dealWithCaps(tieredOrder(players, ratingOf, rng), caps)
  return toTeams(rosters, targetSize, true)
}

/**
 * Team sizes for "rolling subs": every team gets `targetSize` starters, and the
 * surplus (players beyond teamCount × targetSize) is spread evenly as subs.
 * Returns null when there is no surplus (not enough to fill every team) — the
 * caller should fall back to the sequential/borrow split.
 *
 * Example: 18 players, 2 teams, target 7 -> [9, 9] (7 starters + 2 subs each).
 *          22 players, 3 teams, target 7 -> [8, 7, 7].
 */
export function rollingSubSizes(
  total: number,
  teamCount: number,
  targetSize: number,
): number[] | null {
  const surplus = total - teamCount * targetSize
  if (surplus <= 0) return null
  const caps = Array.from({ length: teamCount }, () => targetSize)
  for (let i = 0; i < surplus; i++) caps[i % teamCount] += 1
  return caps
}

/**
 * Rolling-subs generation: even teams with a bench. Distributes the surplus
 * evenly (each team = targetSize starters + subs). Falls back to the
 * sequential (borrow) split when there aren't enough players for subs.
 * Pass `ratingOf` to also balance by skill.
 */
export function generateEvenTeams(
  players: Player[],
  teamCount: number,
  targetSize: number,
  ratingOf: RatingFn | null = null,
  rng: () => number = Math.random,
): Team[] {
  const caps = rollingSubSizes(players.length, teamCount, targetSize)
  if (!caps) {
    return ratingOf
      ? generateBalancedTeams(players, ratingOf, teamCount, targetSize, rng)
      : generateTeams(players, teamCount, targetSize, rng)
  }
  const ordered = ratingOf ? tieredOrder(players, ratingOf, rng) : fisherYatesShuffle(players, rng)
  return toTeams(dealWithCaps(ordered, caps), targetSize, false)
}

/**
 * Preview the sequential team sizes for a given roster count (no shuffling).
 */
export function previewTeamSizes(
  total: number,
  teamCount: number,
  targetSize: number,
): number[] {
  const sizes: number[] = []
  let remaining = Math.max(0, total)
  for (let i = 0; i < teamCount; i++) {
    if (i === teamCount - 1) {
      sizes.push(remaining)
    } else {
      const take = Math.min(targetSize, remaining)
      sizes.push(take)
      remaining -= take
    }
  }
  return sizes
}

/** Preview sizes honoring the current mode (rolling subs vs sequential). */
export function previewSizes(
  total: number,
  teamCount: number,
  targetSize: number,
  rollingSubs: boolean,
): number[] {
  if (rollingSubs) {
    const caps = rollingSubSizes(total, teamCount, targetSize)
    if (caps) return caps
  }
  return previewTeamSizes(total, teamCount, targetSize)
}

/** Game rule: <=18 players -> 2 teams (rolling subs); >=19 -> 3 teams (rotations). */
export function recommendedTeamCount(total: number): number {
  return total >= 19 ? 3 : 2
}
