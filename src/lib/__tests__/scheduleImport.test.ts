import { describe, it, expect } from 'vitest'
import { parseScheduleText } from '../scheduleImport'
import type { Team } from '../../types'
import { colorForIndex } from '../../constants'

const SAMPLE = `⚽ TONIGHT'S MATCH SCHEDULE ⚽
(8 mins per game. Running clock!)

1. ⚪ White vs ⚫ Black
2. ⚫ Black vs 🔴 Red
3. 🔴 Red vs 🔵 Blue
4. 🔵 Blue vs ⚪ White
5. ⚫ Black vs 🔴 Red
6. 🔴 Red vs ⚪ White
7. ⚪ White vs 🔵 Blue
8. 🔵 Blue vs ⚫ Black
9. ⚪ White vs 🔴 Red
10. ⚪ White vs ⚫ Black
11. ⚫ Black vs 🔵 Blue
12. 🔵 Blue vs 🔴 Red
13. ⚪ White vs ⚫ Black
14. ⚫ Black vs 🔴 Red
15. 🔴 Red vs 🔵 Blue
Continue from where you left off.`

describe('parseScheduleText', () => {
  it('parses the pasted 15-game schedule into teams + matches', () => {
    const res = parseScheduleText(SAMPLE)
    expect(res).not.toBeNull()
    const { teams, schedule, minutesPerGame } = res!
    expect(schedule).toHaveLength(15)
    expect(minutesPerGame).toBe(8)
    // Colours appear in first-seen order: White, Black, Red, Blue.
    expect(teams.map((t) => t.color.name)).toEqual(['White', 'Black', 'Red', 'Blue'])
    // Game 1: White (id0) vs Black (id1); Red + Blue rest.
    expect(schedule[0]).toMatchObject({ index: 1, home: 0, away: 1 })
    expect(schedule[0].resting.sort()).toEqual([2, 3])
    // Game 4: Blue vs White.
    expect(schedule[3]).toMatchObject({ home: 3, away: 0 })
  })

  it('ignores header, notes and blank lines', () => {
    const res = parseScheduleText(SAMPLE)!
    // 15 real matches only, despite the 3 non-match lines.
    expect(res.schedule).toHaveLength(15)
  })

  it('reuses existing team rosters when the colour matches', () => {
    const existing: Team[] = [
      { id: 0, color: colorForIndex(0), players: ['Ann', 'Bob'], starters: 2 }, // White
      { id: 1, color: colorForIndex(2), players: ['Cy', 'Dee'], starters: 2 }, // Red
    ]
    const res = parseScheduleText('1. White vs Red\n2. Red vs White', existing)!
    const white = res.teams.find((t) => t.color.id === 'white')!
    const red = res.teams.find((t) => t.color.id === 'red')!
    expect(white.players).toEqual(['Ann', 'Bob'])
    expect(red.players).toEqual(['Cy', 'Dee'])
  })

  it('works with plain names (no emoji)', () => {
    const res = parseScheduleText('1. White vs Black\n2. Black vs White')!
    expect(res.teams.map((t) => t.color.name)).toEqual(['White', 'Black'])
    expect(res.schedule).toHaveLength(2)
  })

  it('returns null when no match lines are found', () => {
    expect(parseScheduleText('just some random text\nno teams here')).toBeNull()
    expect(parseScheduleText('')).toBeNull()
    expect(parseScheduleText('1. White vs White')).toBeNull() // a team can't play itself
  })
})
