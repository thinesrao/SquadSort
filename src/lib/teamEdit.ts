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
