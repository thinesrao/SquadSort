import { describe, it, expect } from 'vitest'
import { encodeTeams, decodeTeams } from '../shareLink'
import { generateTeams } from '../teamGenerator'

describe('shareLink encode/decode', () => {
  it('round-trips teams (names, sizes, starters, colors)', () => {
    const teams = generateTeams(
      Array.from({ length: 18 }, (_, i) => `P${i + 1}`),
      2,
      7,
      () => 0.5,
    )
    teams[0].starters = 7
    const decoded = decodeTeams(encodeTeams(teams, 7))
    expect(decoded).not.toBeNull()
    expect(decoded!.targetSize).toBe(7)
    expect(decoded!.teams.map((t) => t.players)).toEqual(teams.map((t) => t.players))
    expect(decoded!.teams.map((t) => t.starters)).toEqual(teams.map((t) => t.starters))
    expect(decoded!.teams.map((t) => t.color.name)).toEqual(teams.map((t) => t.color.name))
  })

  it('handles unicode names', () => {
    const teams = [{ id: 0, color: { name: 'White' } as never, players: ['René', 'Zoë 🐐'], starters: 2 }]
    const decoded = decodeTeams(encodeTeams(teams as never, 7))
    expect(decoded!.teams[0].players).toEqual(['René', 'Zoë 🐐'])
  })

  it('returns null for garbage', () => {
    expect(decodeTeams('not-valid-base64!!')).toBeNull()
    expect(decodeTeams(btoa('{"nope":1}').replace(/=+$/, ''))).toBeNull()
  })
})
