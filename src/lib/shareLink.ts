import type { Team } from '../types'
import { colorForIndex } from '../constants'

/**
 * Encode the generated teams into a URL hash so they can be opened on another
 * phone or dropped into a chat — no backend. Only names + starters + target
 * size travel; the schedule is regenerated on the receiving end.
 */

interface Payload {
  v: 1
  ts: number
  teams: { p: string[]; s: number }[]
}

function b64urlEncode(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(b64)))
}

export function encodeTeams(teams: Team[], targetSize: number): string {
  const payload: Payload = {
    v: 1,
    ts: targetSize,
    teams: teams.map((t) => ({ p: t.players, s: t.starters ?? t.players.length })),
  }
  return b64urlEncode(JSON.stringify(payload))
}

export function decodeTeams(code: string): { teams: Team[]; targetSize: number } | null {
  try {
    const payload = JSON.parse(b64urlDecode(code)) as Payload
    if (payload.v !== 1 || !Array.isArray(payload.teams)) return null
    const teams: Team[] = payload.teams.map((t, idx) => {
      const players = (t.p ?? []).map(String)
      return {
        id: idx,
        color: colorForIndex(idx),
        players,
        starters: typeof t.s === 'number' ? t.s : players.length,
      }
    })
    if (teams.length === 0) return null
    return { teams, targetSize: payload.ts || 7 }
  } catch {
    return null
  }
}

export function buildShareUrl(teams: Team[], targetSize: number): string {
  const base = `${location.origin}${location.pathname}`
  return `${base}#t=${encodeTeams(teams, targetSize)}`
}

/** If the current URL hash carries shared teams, decode them (and clear it). */
export function readSharedFromHash(): { teams: Team[]; targetSize: number } | null {
  if (typeof location === 'undefined') return null
  const m = /[#&]t=([^&]+)/.exec(location.hash)
  if (!m) return null
  const result = decodeTeams(m[1])
  if (result) {
    try {
      history.replaceState(null, '', location.pathname + location.search)
    } catch {
      /* ignore */
    }
  }
  return result
}
