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
