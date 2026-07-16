import type { Match, Settings, Team } from '../types'

/**
 * Render the teams + schedule to a PNG and share it (WhatsApp etc.) via the
 * Web Share API, falling back to a file download. Drawn entirely with the
 * Canvas API — no external libraries, no dependency on Tailwind's (oklch)
 * computed colors — so it works offline and looks identical everywhere.
 *
 * Layout is a 2-up grid (e.g. White | Black on top, Red | Schedule below) so
 * the image stays close to square and WhatsApp doesn't crop the preview.
 * Each team is illustrated with a football-shirt icon in its kit colour so
 * White vs Black vs Red is unmistakable.
 */

export type ShareOutcome = 'shared' | 'downloaded' | 'failed'

/** Which slice of the line-up the shared image shows. */
export type ShareMode = 'teams' | 'schedule' | 'both'

export interface ShareOptions {
  mode?: ShareMode
  paid?: Set<string>
  gks?: Set<string>
}

// --- Layout constants (device-independent px) ---
const W = 1080
const PAD = 56
const GAP = 24
const BG = '#0b0b0e'
const CARD = '#17171b'
const CHIP = '#3f3f46'
const TITLE = '#fafafa'
const MUTED = '#a1a1aa'
const NAME_COLOR = '#e4e4e7'
const AMBER = '#fbbf24'
const ACCENT = '#34d399'

const TITLE_BLOCK = 190
const FOOTER = 84
const HEADER_H = 92
const NAME_LINE = 48
const CARD_BOTTOM = 16
const SCHED_HEADER = 64
const MATCH_LINE = 52
const SUB_LINE = 42

const font = (size: number, weight = 400) =>
  `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

// --- Colour helpers -------------------------------------------------------
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const outlineFor = (hex: string) => (luminance(hex) > 0.5 ? '#3f3f46' : '#e4e4e7')
const edgeFor = (hex: string) => (luminance(hex) < 0.06 ? '#52525b' : hex)
const countColor = (hex: string) => (luminance(hex) < 0.15 ? '#e4e4e7' : hex)

// --- Primitives -----------------------------------------------------------
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = outlineFor(color)
  ctx.stroke()
}

function drawJersey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  const P = (nx: number, ny: number): [number, number] => [x + nx * w, y + ny * h]
  const pts: Array<[number, number]> = [
    P(0.36, 0.08),
    P(0.2, 0.16),
    P(0.03, 0.28),
    P(0.11, 0.46),
    P(0.26, 0.37),
    P(0.26, 0.97),
    P(0.74, 0.97),
    P(0.74, 0.37),
    P(0.89, 0.46),
    P(0.97, 0.28),
    P(0.8, 0.16),
    P(0.64, 0.08),
  ]
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  const c = P(0.5, 0.24)
  ctx.quadraticCurveTo(c[0], c[1], pts[0][0], pts[0][1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2.5, w * 0.055)
  ctx.strokeStyle = outlineFor(fill)
  ctx.stroke()
}

/** Mini SquadSort logo: three overlapping kit jerseys + neon frame. */
function drawLogoMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#111116'
  roundRect(ctx, x, y, s, s, s * 0.22)
  ctx.fill()
  const jw = s * 0.42
  const jh = s * 0.46
  drawJersey(ctx, x + s * 0.05, y + s * 0.32, jw, jh, '#e5352b')
  drawJersey(ctx, x + s * 0.53, y + s * 0.32, jw, jh, '#f5f5f5')
  drawJersey(ctx, x + s * 0.29, y + s * 0.2, jw, jh, '#0f0f13')
  ctx.lineWidth = Math.max(2, s * 0.05)
  ctx.strokeStyle = '#00ff87'
  roundRect(ctx, x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.17)
  ctx.stroke()
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

// --- Block measuring + drawing --------------------------------------------
const hasSubs = (team: Team) => (team.starters ?? team.players.length) < team.players.length

const teamCardHeight = (team: Team) =>
  HEADER_H +
  Math.max(1, team.players.length) * NAME_LINE +
  (hasSubs(team) ? NAME_LINE : 0) +
  CARD_BOTTOM

function scheduleHeight(schedule: Match[], header = true): number {
  let h = header ? SCHED_HEADER : 12
  for (const m of schedule) h += MATCH_LINE + (m.borrow || m.note ? SUB_LINE : 0)
  return h
}

function drawTeamCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  team: Team,
  paid?: Set<string>,
  gks?: Set<string>,
) {
  const trackPay = !!paid && paid.size > 0
  const h = teamCardHeight(team)
  ctx.fillStyle = CARD
  roundRect(ctx, x, y, w, h, 20)
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = edgeFor(team.color.hex)
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 18)
  ctx.stroke()

  // Jersey chip
  const chip = 60
  const cx = x + 18
  const cy = y + (HEADER_H - chip) / 2
  ctx.fillStyle = CHIP
  roundRect(ctx, cx, cy, chip, chip, 14)
  ctx.fill()
  drawJersey(ctx, cx + 8, cy + 7, chip - 16, chip - 12, team.color.hex)

  // Name + count
  const tx = cx + chip + 16
  ctx.textAlign = 'left'
  ctx.fillStyle = TITLE
  ctx.font = font(32, 800)
  ctx.fillText(truncate(ctx, `Team ${team.color.name}`, w - (tx - x) - 68), tx, y + HEADER_H / 2 + 6)
  ctx.textAlign = 'right'
  ctx.fillStyle = countColor(team.color.dotHex)
  ctx.font = font(40, 800)
  ctx.fillText(`${team.players.length}`, x + w - 18, y + HEADER_H / 2 + 12)
  ctx.textAlign = 'left'

  // Divider
  ctx.strokeStyle = '#27272a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + 16, y + HEADER_H)
  ctx.lineTo(x + w - 16, y + HEADER_H)
  ctx.stroke()

  // Players (single column within the half-width card)
  const nameMax = w - 72 - (trackPay ? 34 : 0)
  const starters = team.starters ?? team.players.length
  let ry = y + HEADER_H
  team.players.forEach((name, i) => {
    if (i === starters && starters < team.players.length) {
      // "SUBS" divider
      ctx.textAlign = 'left'
      ctx.fillStyle = '#34d399'
      ctx.font = font(20, 800)
      ctx.fillText('SUBS', x + 24, ry + 30)
      ctx.strokeStyle = '#27272a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 96, ry + 24)
      ctx.lineTo(x + w - 16, ry + 24)
      ctx.stroke()
      ry += NAME_LINE
    }
    const isSub = i >= starters
    const ny = ry + 34
    dot(ctx, x + 26, ny - 10, 7, team.color.dotHex)
    ctx.textAlign = 'left'
    ctx.fillStyle = isSub ? MUTED : NAME_COLOR
    ctx.font = font(30, 500)
    const gkTag = gks?.has(name) ? '🧤 ' : ''
    const label = isSub ? `S${i - starters + 1}. ${gkTag}${name}` : `${i + 1}. ${gkTag}${name}`
    ctx.fillText(truncate(ctx, label, nameMax), x + 44, ny)
    if (trackPay) {
      const isPaid = paid!.has(name)
      ctx.textAlign = 'center'
      ctx.font = font(26, 800)
      ctx.fillStyle = isPaid ? '#34d399' : '#fbbf24'
      ctx.fillText(isPaid ? '✓' : '✗', x + w - 24, ny)
      ctx.textAlign = 'left'
    }
    ry += NAME_LINE
  })
}

function drawScheduleBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  teams: Team[],
  schedule: Match[],
  header = true,
) {
  if (header) {
    ctx.textAlign = 'left'
    ctx.fillStyle = TITLE
    ctx.font = font(34, 800)
    ctx.fillText('Match Schedule', x, y + 36)
  }
  let yy = y + (header ? SCHED_HEADER : 12)

  for (const m of schedule) {
    const home = teams[m.home]
    const away = teams[m.away]
    let xx = x

    ctx.fillStyle = '#27272a'
    roundRect(ctx, xx, yy - 27, 34, 34, 9)
    ctx.fill()
    ctx.fillStyle = ACCENT
    ctx.font = font(20, 700)
    ctx.textAlign = 'center'
    ctx.fillText(`${m.index}`, xx + 17, yy - 3)
    ctx.textAlign = 'left'
    xx += 46

    dot(ctx, xx + 7, yy - 11, 8, home.color.dotHex)
    xx += 22
    ctx.fillStyle = NAME_COLOR
    ctx.font = font(28, 700)
    ctx.fillText(home.color.name, xx, yy)
    xx += ctx.measureText(home.color.name).width + 12
    ctx.fillStyle = MUTED
    ctx.font = font(24, 500)
    ctx.fillText('v', xx, yy)
    xx += ctx.measureText('v').width + 12
    dot(ctx, xx + 7, yy - 11, 8, away.color.dotHex)
    xx += 22
    ctx.fillStyle = NAME_COLOR
    ctx.font = font(28, 700)
    ctx.fillText(away.color.name, xx, yy)
    xx += ctx.measureText(away.color.name).width + 12

    const rest = m.resting.map((id) => teams[id].color.name).join(', ')
    if (rest) {
      ctx.fillStyle = MUTED
      ctx.font = font(22, 500)
      ctx.fillText(truncate(ctx, `· ${rest} rest${m.resting.length === 1 ? 's' : ''}`, x + w - xx), xx, yy)
    }
    yy += MATCH_LINE

    if (m.borrow) {
      const b = m.borrow
      ctx.fillStyle = AMBER
      ctx.font = font(24, 600)
      ctx.fillText(
        truncate(
          ctx,
          `↳ ${teams[b.borrowerTeamId].color.name} borrows ${b.count} from ${teams[b.fromTeamId].color.name}`,
          w - 46,
        ),
        x + 46,
        yy,
      )
      yy += SUB_LINE
    } else if (m.note) {
      ctx.fillStyle = AMBER
      ctx.font = font(22, 500)
      ctx.fillText(truncate(ctx, `⚠ ${m.note}`, w - 46), x + 46, yy)
      yy += SUB_LINE
    }
  }
}

// --- Cell/row layout ------------------------------------------------------
type Cell =
  | { type: 'team'; team: Team; x: number; w: number }
  | { type: 'sched'; x: number; w: number; header: boolean }
interface Row {
  cells: Cell[]
  h: number
}

function renderCanvas(
  teams: Team[],
  schedule: Match[],
  settings: Settings,
  opts: ShareOptions,
): HTMLCanvasElement {
  const mode = opts.mode ?? 'both'
  const { paid, gks } = opts
  const contentW = W - PAD * 2
  const cardW = (contentW - GAP) / 2
  const rightX = PAD + cardW + GAP

  const rows: Row[] = []

  // Team cards (rows of two) — everything except the schedule-only image.
  if (mode !== 'schedule') {
    for (let i = 0; i < teams.length; i += 2) {
      const cells: Cell[] = [{ type: 'team', team: teams[i], x: PAD, w: cardW }]
      let h = teamCardHeight(teams[i])
      if (i + 1 < teams.length) {
        cells.push({ type: 'team', team: teams[i + 1], x: rightX, w: cardW })
        h = Math.max(h, teamCardHeight(teams[i + 1]))
      }
      rows.push({ cells, h })
    }
  }

  // Schedule-only image: just the full-width running order (the coloured dots
  // in each row already identify the teams, so no legend is needed).
  if (mode === 'schedule') {
    if (schedule.length > 0) {
      // No sub-header — the image title already says "Match Schedule".
      rows.push({
        cells: [{ type: 'sched', x: PAD, w: contentW, header: false }],
        h: scheduleHeight(schedule, false),
      })
    }
  } else if (mode === 'both' && schedule.length > 0) {
    // Place the schedule beside the last team if there's a free right cell
    // (odd team count → nice square 2×2), otherwise on a full-width row below.
    const schedH = scheduleHeight(schedule)
    const last = rows[rows.length - 1]
    if (last && last.cells.length === 1) {
      last.cells.push({ type: 'sched', x: rightX, w: cardW, header: true })
      last.h = Math.max(last.h, schedH)
    } else {
      rows.push({ cells: [{ type: 'sched', x: PAD, w: contentW, header: true }], h: schedH })
    }
  }

  const contentHeight = rows.reduce((s, r) => s + r.h + GAP, 0)
  const height = PAD + TITLE_BLOCK + contentHeight + FOOTER + PAD

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, height)

  // Title — logo mark + wordmark
  const logoS = 56
  drawLogoMark(ctx, PAD, PAD, logoS)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = ACCENT
  ctx.font = font(32, 800)
  ctx.fillText('SQUADSORT', PAD + logoS + 18, PAD + logoS / 2)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = TITLE
  ctx.font = font(58, 800)
  const heading =
    mode === 'schedule' ? 'Match Schedule' : mode === 'teams' ? 'Team Line-ups' : 'Teams & Schedule'
  ctx.fillText(heading, PAD, PAD + logoS + 62)
  ctx.fillStyle = MUTED
  ctx.font = font(28, 500)
  const total = teams.reduce((n, t) => n + t.players.length, 0)
  const subtitle =
    mode === 'schedule'
      ? `${schedule.length} games · ${teams.length} teams`
      : `${total} players · ${settings.targetSize}-a-side`
  ctx.fillText(subtitle, PAD, PAD + logoS + 102)

  // Rows
  let y = PAD + TITLE_BLOCK
  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell.type === 'team') drawTeamCard(ctx, cell.x, y, cell.w, cell.team, paid, gks)
      else drawScheduleBlock(ctx, cell.x, y, cell.w, teams, schedule, cell.header)
    }
    y += row.h + GAP
  }

  // Footer
  ctx.textAlign = 'left'
  ctx.fillStyle = MUTED
  ctx.font = font(24, 500)
  ctx.fillText('Made with SquadSort', PAD, y + 30)

  return canvas
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

const SHARE_META: Record<ShareMode, { file: string; title: string; text: string }> = {
  teams: { file: 'squadsort-teams.png', title: 'SquadSort Teams', text: 'Team line-ups ⚽' },
  schedule: {
    file: 'squadsort-schedule.png',
    title: 'SquadSort Schedule',
    text: 'Match schedule ⚽',
  },
  both: {
    file: 'squadsort-lineups.png',
    title: 'SquadSort Teams',
    text: 'Teams & schedule ⚽',
  },
}

/** Build the image and share it (or download it as a fallback). */
export async function shareTeamsImage(
  teams: Team[],
  schedule: Match[],
  settings: Settings,
  options: ShareOptions = {},
): Promise<ShareOutcome> {
  if (teams.length === 0) return 'failed'
  const mode = options.mode ?? 'both'

  const canvas = renderCanvas(teams, schedule, settings, options)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return 'failed'

  const meta = SHARE_META[mode]
  const file = new File([blob], meta.file, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean
    share?: (data?: unknown) => Promise<void>
  }

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: meta.title, text: meta.text })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
      // otherwise fall through to download
    }
  }

  download(blob, meta.file)
  return 'downloaded'
}
