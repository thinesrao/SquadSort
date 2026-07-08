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

/**
 * CRITICAL sorting algorithm.
 *
 * Unlike an even distribution, this fills teams sequentially up to the target
 * size, then dumps the remainder into the final team:
 *   1. Randomize the players (Fisher–Yates).
 *   2. Fill each non-final team up to `targetSize`.
 *   3. The final team receives all remaining players.
 *
 * Example: 19 players, targetSize 7, 3 teams -> [7, 7, 5].
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
      ? shuffled.slice(cursor) // final team gets everything that's left
      : shuffled.slice(cursor, cursor + targetSize) // fill to target
    cursor += slice.length
    teams.push({ id: i, color: colorForIndex(i), players: slice })
  }

  return teams
}

export type RatingFn = (name: string) => number

/**
 * Skill-balanced generation. Buckets players into 3/2/1-star tiers, shuffles
 * within each tier, then snake-drafts them across the teams (A,B,C,C,B,A,…) so
 * the strongest players are spread evenly. Still respects the sequential-fill
 * target sizes (e.g. 19 / 7 / 3 → a *balanced* 7-7-5), by skipping any team
 * that has already reached its capacity.
 */
export function generateBalancedTeams(
  players: Player[],
  ratingOf: RatingFn,
  teamCount: number,
  targetSize: number,
  rng: () => number = Math.random,
): Team[] {
  const caps = previewTeamSizes(players.length, teamCount, targetSize)
  const buckets: Record<1 | 2 | 3, Player[]> = { 1: [], 2: [], 3: [] }
  for (const p of players) {
    const r = Math.min(3, Math.max(1, Math.round(ratingOf(p)))) as 1 | 2 | 3
    buckets[r].push(p)
  }
  const ordered = [
    ...fisherYatesShuffle(buckets[3], rng),
    ...fisherYatesShuffle(buckets[2], rng),
    ...fisherYatesShuffle(buckets[1], rng),
  ]

  const rosters: Player[][] = Array.from({ length: teamCount }, () => [])
  let i = 0
  let dir = 1
  const nextIndex = () => {
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
    let t = nextIndex()
    let guard = 0
    while (rosters[t].length >= caps[t] && guard++ < teamCount * 4) t = nextIndex()
    rosters[t].push(p)
  }

  return rosters.map((pl, idx) => ({ id: idx, color: colorForIndex(idx), players: pl }))
}

/**
 * Preview the team sizes for a given roster count without shuffling — used to
 * show the split on the Settings screen before generating.
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
