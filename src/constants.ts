import type { Settings, TeamColor } from './types'

/**
 * Team colors in assignment order. Per spec: Team A = White, B = Black,
 * C = Red. Extra colors extend the palette for 4+ teams.
 */
export const TEAM_COLORS: TeamColor[] = [
  {
    id: 'white',
    name: 'White',
    emoji: '⚪',
    headerBg: 'bg-zinc-100',
    headerText: 'text-zinc-900',
    ring: 'ring-zinc-300/60',
    swatch: 'bg-zinc-100',
  },
  {
    id: 'black',
    name: 'Black',
    emoji: '⚫',
    headerBg: 'bg-zinc-950',
    headerText: 'text-zinc-100',
    ring: 'ring-zinc-600',
    swatch: 'bg-zinc-950 ring-1 ring-zinc-500',
  },
  {
    id: 'red',
    name: 'Red',
    emoji: '🔴',
    headerBg: 'bg-red-600',
    headerText: 'text-white',
    ring: 'ring-red-500/60',
    swatch: 'bg-red-600',
  },
  {
    id: 'blue',
    name: 'Blue',
    emoji: '🔵',
    headerBg: 'bg-blue-600',
    headerText: 'text-white',
    ring: 'ring-blue-500/60',
    swatch: 'bg-blue-600',
  },
  {
    id: 'green',
    name: 'Green',
    emoji: '🟢',
    headerBg: 'bg-green-600',
    headerText: 'text-white',
    ring: 'ring-green-500/60',
    swatch: 'bg-green-600',
  },
  {
    id: 'yellow',
    name: 'Yellow',
    emoji: '🟡',
    headerBg: 'bg-yellow-400',
    headerText: 'text-zinc-900',
    ring: 'ring-yellow-400/60',
    swatch: 'bg-yellow-400',
  },
  {
    id: 'orange',
    name: 'Orange',
    emoji: '🟠',
    headerBg: 'bg-orange-500',
    headerText: 'text-white',
    ring: 'ring-orange-500/60',
    swatch: 'bg-orange-500',
  },
  {
    id: 'purple',
    name: 'Purple',
    emoji: '🟣',
    headerBg: 'bg-purple-600',
    headerText: 'text-white',
    ring: 'ring-purple-500/60',
    swatch: 'bg-purple-600',
  },
]

export const DEFAULT_SETTINGS: Settings = { targetSize: 7, teamCount: 3 }

export const MIN_TEAMS = 2
export const MAX_TEAMS = TEAM_COLORS.length
export const MIN_TEAM_SIZE = 1
export const MAX_TEAM_SIZE = 15

/** Timer defaults (seconds). */
export const DEFAULT_TIMER_SECONDS = 8 * 60
export const TIMER_PRESETS_SECONDS = [5 * 60, 8 * 60, 10 * 60, 12 * 60]

export function colorForIndex(i: number): TeamColor {
  return TEAM_COLORS[i % TEAM_COLORS.length]
}
