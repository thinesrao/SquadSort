import type { Match, Team, TeamColor } from '../types'
import { TEAM_COLORS } from '../constants'

/**
 * Import a schedule from pasted text so an organiser can drop in a running
 * order they already have (from a chat, a previous week, etc.) and have the
 * app adopt it — driving the timer, the checklist and the schedule image.
 *
 * Expected shape (header/notes lines are ignored):
 *   ⚽ TONIGHT'S MATCH SCHEDULE ⚽
 *   (8 mins per game. Running clock!)
 *   1. ⚪ White vs ⚫ Black
 *   2. ⚫ Black vs 🔴 Red
 *   ...
 * A line counts as a match when it mentions exactly two known team colours
 * (by name or emoji). Teams are inferred from the colours that appear.
 */

export interface ImportedSchedule {
  teams: Team[]
  schedule: Match[]
  minutesPerGame?: number
}

// Lookups: lowercased colour name -> TeamColor, and emoji -> TeamColor.
const BY_NAME = new Map<string, TeamColor>(TEAM_COLORS.map((c) => [c.name.toLowerCase(), c]))
const BY_EMOJI = new Map<string, TeamColor>(TEAM_COLORS.map((c) => [c.emoji, c]))

// Matches a colour name as a whole word, or any of the colour emojis.
const NAME_ALT = TEAM_COLORS.map((c) => c.name).join('|')
const EMOJI_ALT = TEAM_COLORS.map((c) => c.emoji).join('|')
const TOKEN_RE = new RegExp(`\\b(${NAME_ALT})\\b|(${EMOJI_ALT})`, 'gi')

/**
 * Every colour token on a line, in order of appearance, with consecutive
 * duplicates collapsed — a side written as "⚪ White" yields both an emoji and
 * a name for the same colour, which should count as one team.
 */
function coloursOnLine(line: string): TeamColor[] {
  const out: TeamColor[] = []
  for (const m of line.matchAll(TOKEN_RE)) {
    const color = m[1] ? BY_NAME.get(m[1].toLowerCase()) : BY_EMOJI.get(m[2])
    if (color && out[out.length - 1]?.id !== color.id) out.push(color)
  }
  return out
}

function minutesOf(text: string): number | undefined {
  const m = /(\d+)\s*min/i.exec(text)
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  return n >= 1 && n <= 90 ? n : undefined
}

export function parseScheduleText(text: string, existingTeams: Team[] = []): ImportedSchedule | null {
  if (!text.trim()) return null

  // Collect the matches (as colour-id pairs) and the colours that appear.
  const pairs: Array<[string, string]> = []
  const order: string[] = [] // distinct colour ids, first-appearance order
  const noteColour = (id: string) => {
    if (!order.includes(id)) order.push(id)
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const colours = coloursOnLine(rawLine)
    if (colours.length !== 2) continue // header, notes, blanks, malformed
    const [home, away] = colours
    if (home.id === away.id) continue // a team can't play itself
    pairs.push([home.id, away.id])
    noteColour(home.id)
    noteColour(away.id)
  }

  if (pairs.length === 0 || order.length < 2) return null

  const idOf = new Map(order.map((colourId, idx) => [colourId, idx]))
  const teams: Team[] = order.map((colourId, idx) => {
    const color = TEAM_COLORS.find((c) => c.id === colourId)!
    const existing = existingTeams.find((t) => t.color.id === colourId)
    const players = existing ? [...existing.players] : []
    return {
      id: idx,
      color,
      players,
      starters: existing?.starters ?? players.length,
    }
  })
  const allIds = teams.map((t) => t.id)

  const schedule: Match[] = pairs.map(([homeId, awayId], i) => {
    const home = idOf.get(homeId)!
    const away = idOf.get(awayId)!
    return {
      index: i + 1,
      home,
      away,
      resting: allIds.filter((id) => id !== home && id !== away),
    }
  })

  return { teams, schedule, minutesPerGame: minutesOf(text) }
}
