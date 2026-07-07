/** A parsed player is just their display name. */
export type Player = string

export type TeamColorId =
  | 'white'
  | 'black'
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'purple'

/**
 * Visual identity for a team. All style fields are full, literal Tailwind
 * class strings so Tailwind's source scanner can pick them up (no dynamic
 * `bg-${x}` concatenation, which the scanner cannot see).
 */
export interface TeamColor {
  id: TeamColorId
  name: string // e.g. "White"
  emoji: string // e.g. "⚪"
  headerBg: string // solid header background
  headerText: string // contrasting header text
  ring: string // card ring / border color
  swatch: string // small legend/nav dot
  // Raw hex values for canvas rendering (the share-as-image feature), where
  // Tailwind classes aren't available.
  hex: string // header background
  textHex: string // header text
  dotHex: string // solid dot / bullet
}

export interface Team {
  id: number // 0-based index, also its schedule id
  color: TeamColor
  players: Player[]
}

/** "Team X borrows N players from Team Y" for a rolling-sub round. */
export interface BorrowNote {
  borrowerTeamId: number
  fromTeamId: number
  count: number
}

export interface Match {
  index: number // 1-based match number
  home: number // team id
  away: number // team id
  resting: number[] // team ids sitting this match out
  borrow?: BorrowNote // present when the short team plays and needs subs
  note?: string // freeform note (e.g. 2-team, no-bench case)
}

export interface Settings {
  targetSize: number
  teamCount: number
}

export type ViewId = 'roster' | 'settings' | 'result' | 'timer'
