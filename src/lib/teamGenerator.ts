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

export type Pairing = [string, string]

export interface BuildOptions {
  teamCount: number
  targetSize: number
  rollingSubs: boolean
  ratingOf?: RatingFn | null
  isGk?: (name: string) => boolean
  keepTogether?: Pairing[]
  keepApart?: Pairing[]
  rng?: () => number
}

export interface BuildResult {
  teams: Team[]
  warnings: string[]
}

/**
 * Unified team builder used by the app. Layers, in order:
 *   1. sizing (rolling-subs even split or sequential borrow),
 *   2. goalkeeper pre-seed (one keeper per team where possible),
 *   3. snake draft of the rest (skill-tiered when a rating fn is given),
 *   4. best-effort repair of keep-together / keep-apart constraints.
 * Returns any warnings (too few keepers, unsatisfiable constraints).
 */
export function buildTeams(players: Player[], opts: BuildOptions): BuildResult {
  const {
    teamCount,
    targetSize,
    rollingSubs,
    ratingOf = null,
    isGk,
    keepTogether = [],
    keepApart = [],
    rng = Math.random,
  } = opts
  const warnings: string[] = []
  const n = players.length

  let caps: number[]
  let allStarters: boolean
  const rc = rollingSubs ? rollingSubSizes(n, teamCount, targetSize) : null
  if (rc) {
    caps = rc
    allStarters = false
  } else {
    caps = previewTeamSizes(n, teamCount, targetSize)
    allStarters = true
  }

  const order = (list: Player[]) =>
    ratingOf ? tieredOrder(list, ratingOf, rng) : fisherYatesShuffle(list, rng)

  const rosters: Player[][] = Array.from({ length: teamCount }, () => [])
  const assigned = new Set<Player>()

  // 1) Goalkeeper pre-seed: one per team, in draft order.
  if (isGk) {
    const gks = order(players.filter((p) => isGk(p)))
    let ti = 0
    for (const g of gks) {
      while (ti < teamCount && rosters[ti].length >= caps[ti]) ti++
      if (ti >= teamCount) break
      rosters[ti].push(g)
      assigned.add(g)
      ti++
    }
    if (gks.length < teamCount) {
      warnings.push(`Only ${gks.length} keeper${gks.length === 1 ? '' : 's'} for ${teamCount} teams`)
    }
  }

  // 2) Snake-draft the remaining players.
  const rest = order(players.filter((p) => !assigned.has(p)))
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
  for (const p of rest) {
    let t = next()
    let guard = 0
    while (rosters[t].length >= caps[t] && guard++ < teamCount * 4) t = next()
    rosters[t].push(p)
  }

  // 3) Repair constraints via size-preserving swaps.
  const teamOf = (name: string) => rosters.findIndex((r) => r.includes(name))
  const present = ([a, b]: Pairing) => teamOf(a) >= 0 && teamOf(b) >= 0
  const constrained = (name: string) =>
    (isGk?.(name) ?? false) ||
    keepTogether.some(([a, b]) => a === name || b === name) ||
    keepApart.some(([a, b]) => a === name || b === name)
  const swapInto = (name: string, targetTeam: number): boolean => {
    const from = teamOf(name)
    if (from < 0 || from === targetTeam) return from === targetTeam
    const victim = rosters[targetTeam].find((q) => !constrained(q))
    if (!victim) return false
    rosters[from][rosters[from].indexOf(name)] = victim
    rosters[targetTeam][rosters[targetTeam].indexOf(victim)] = name
    return true
  }
  for (let pass = 0; pass < 5; pass++) {
    let changed = false
    for (const [a, b] of keepTogether) {
      if (!present([a, b]) || teamOf(a) === teamOf(b)) continue
      if (swapInto(b, teamOf(a)) || swapInto(a, teamOf(b))) changed = true
    }
    for (const [a, b] of keepApart) {
      if (!present([a, b]) || teamOf(a) !== teamOf(b)) continue
      for (let t = 0; t < teamCount; t++) {
        if (t !== teamOf(a) && swapInto(b, t)) {
          changed = true
          break
        }
      }
    }
    if (!changed) break
  }
  for (const [a, b] of keepTogether)
    if (present([a, b]) && teamOf(a) !== teamOf(b)) warnings.push(`Couldn't keep ${a} & ${b} together`)
  for (const [a, b] of keepApart)
    if (present([a, b]) && teamOf(a) === teamOf(b)) warnings.push(`Couldn't keep ${a} & ${b} apart`)

  const teams = toTeams(rosters, targetSize, allStarters)
  return { teams, warnings }
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
