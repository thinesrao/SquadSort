import type { Team } from '../types'

/** Deep-ish clone: new team objects with new player arrays (colors are shared). */
function cloneTeams(teams: Team[]): Team[] {
  return teams.map((t) => ({ ...t, players: [...t.players] }))
}

const byId = (teams: Team[], id: number) => teams.find((t) => t.id === id)

/**
 * Swap two players between (or within) teams. Team sizes are preserved.
 * Returns a new teams array; the input is untouched.
 */
export function swapPlayers(
  teams: Team[],
  aTeamId: number,
  aIndex: number,
  bTeamId: number,
  bIndex: number,
): Team[] {
  const next = cloneTeams(teams)
  const a = byId(next, aTeamId)
  const b = byId(next, bTeamId)
  if (!a || !b) return teams
  if (a.players[aIndex] === undefined || b.players[bIndex] === undefined) return teams
  const tmp = a.players[aIndex]
  a.players[aIndex] = b.players[bIndex]
  b.players[bIndex] = tmp
  return next
}

/**
 * Kit swap: move a player onto a target team whose colour they actually own,
 * WITHOUT unbalancing the skills. The player trades places with the
 * closest-rated player already on the target team, so team sizes are preserved
 * and each team's total strength barely moves (the swapped pair are the two
 * most similar players, so the strength delta is the smallest possible).
 *
 * If the target team is empty there is nobody to trade with, so it falls back
 * to a plain move. Returns a new teams array; the input is untouched.
 */
export function swapToTeamBalanced(
  teams: Team[],
  fromTeamId: number,
  fromIndex: number,
  targetTeamId: number,
  ratingOf: (name: string) => number,
): Team[] {
  if (fromTeamId === targetTeamId) return teams
  const from = byId(teams, fromTeamId)
  const target = byId(teams, targetTeamId)
  if (!from || !target) return teams
  const player = from.players[fromIndex]
  if (player === undefined) return teams
  if (target.players.length === 0) return movePlayer(teams, fromTeamId, fromIndex, targetTeamId)

  const rating = ratingOf(player)
  let bestIndex = 0
  let bestDiff = Infinity
  target.players.forEach((name, i) => {
    const diff = Math.abs(ratingOf(name) - rating)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = i
    }
  })
  return swapPlayers(teams, fromTeamId, fromIndex, targetTeamId, bestIndex)
}

/**
 * Move a player from one team to the end of another. Changes team sizes.
 * Returns a new teams array; the input is untouched.
 */
export function movePlayer(
  teams: Team[],
  fromTeamId: number,
  fromIndex: number,
  toTeamId: number,
): Team[] {
  if (fromTeamId === toTeamId) return teams
  const next = cloneTeams(teams)
  const from = byId(next, fromTeamId)
  const to = byId(next, toTeamId)
  if (!from || !to) return teams
  if (from.players[fromIndex] === undefined) return teams
  const [player] = from.players.splice(fromIndex, 1)
  to.players.push(player)
  return next
}
