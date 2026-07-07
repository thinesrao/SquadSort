import type { Match, Settings, Team } from '../types'

/** Human-readable "Team White vs Team Black" with resting note. */
export function matchTitle(match: Match, teams: Team[]): string {
  return `${teams[match.home].color.name} vs ${teams[match.away].color.name}`
}

export function restingLabel(match: Match, teams: Team[]): string {
  if (match.resting.length === 0) return ''
  const names = match.resting.map((id) => teams[id].color.name).join(', ')
  return `${names} rest${match.resting.length === 1 ? 's' : ''}`
}

export function borrowLabel(match: Match, teams: Team[]): string | null {
  if (!match.borrow) return null
  const borrower = teams[match.borrow.borrowerTeamId].color.name
  const from = teams[match.borrow.fromTeamId].color.name
  const p = match.borrow.count === 1 ? 'player' : 'players'
  return `Team ${borrower} borrows ${match.borrow.count} ${p} from Team ${from}`
}

/**
 * Format teams + schedule into a clean, paste-ready WhatsApp text block.
 */
export function formatForWhatsApp(
  teams: Team[],
  schedule: Match[],
  settings: Settings,
): string {
  const lines: string[] = []
  lines.push('⚽ *SquadSort Teams* ⚽')
  lines.push('')

  for (const team of teams) {
    lines.push(`${team.color.emoji} *Team ${team.color.name}* (${team.players.length})`)
    team.players.forEach((p, i) => lines.push(`${i + 1}. ${p}`))
    lines.push('')
  }

  if (schedule.length > 0) {
    lines.push('📋 *Match Schedule*')
    for (const m of schedule) {
      const rest = restingLabel(m, teams)
      const restPart = rest ? ` — ${rest}` : ''
      lines.push(`Match ${m.index}: ${matchTitle(m, teams)}${restPart}`)
      const borrow = borrowLabel(m, teams)
      if (borrow) lines.push(`   ↳ ${borrow}`)
      if (m.note) lines.push(`   ⚠ ${m.note}`)
    }
    lines.push('')
  }

  lines.push(`👥 ${teams.reduce((n, t) => n + t.players.length, 0)} players · target ${settings.targetSize}-a-side`)
  return lines.join('\n').trim()
}
