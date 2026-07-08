import type { Match, Settings, Team } from '../types'

/**
 * Render the teams + schedule to a PNG and share it (WhatsApp etc.) via the
 * Web Share API, falling back to a file download. The image is drawn entirely
 * with the Canvas API — no external libraries, and no dependency on Tailwind's
 * (oklch) computed colors — so it works offline and looks identical everywhere.
 *
 * Each team is illustrated with a football-shirt icon filled in its kit colour
 * (on a neutral chip, with a contrast outline) so White vs Black vs Red is
 * unmistakable even against the dark canvas.
 */

export type ShareOutcome = 'shared' | 'downloaded' | 'failed'

// --- Layout constants (device-independent px) ---
const W = 1080
const PAD = 64
const BG = '#0b0b0e'
const CARD = '#17171b'
const CHIP = '#3f3f46' // neutral chip behind each jersey
const TITLE = '#fafafa'
const MUTED = '#a1a1aa'
const NAME_COLOR = '#e4e4e7'
const AMBER = '#fbbf24'
const ACCENT = '#34d399'

const TITLE_BLOCK = 176
const TEAM_HEADER = 120
const NAME_LINE = 54
const TEAM_GAP = 26
const SCHED_TITLE = 96
const MATCH_LINE = 62
const SUB_LINE = 46
const FOOTER = 92
const NAME_COLS = 2

const font = (size: number, weight = 400) =>
  `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

const nameRows = (count: number) => Math.ceil(count / NAME_COLS)

// --- Colour helpers -------------------------------------------------------
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** WCAG relative luminance, 0 (black) … 1 (white). */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const lin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Outline that stays visible on top of a given fill colour. */
const outlineFor = (hex: string) => (luminance(hex) > 0.5 ? '#3f3f46' : '#e4e4e7')

/** Card edge in the team colour, but never so dark it vanishes on the bg. */
const edgeFor = (hex: string) => (luminance(hex) < 0.06 ? '#52525b' : hex)

function computeHeight(teams: Team[], schedule: Match[]): number {
  let h = PAD + TITLE_BLOCK
  for (const t of teams) {
    h += TEAM_HEADER + Math.max(1, nameRows(t.players.length)) * NAME_LINE + TEAM_GAP
  }
  if (schedule.length > 0) {
    h += SCHED_TITLE
    for (const m of schedule) h += MATCH_LINE + (m.borrow || m.note ? SUB_LINE : 0)
  }
  return h + FOOTER + PAD
}

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

/** Draw a football shirt filling the given box, in `fill` with a contrast edge. */
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
    P(0.36, 0.08), // left neck
    P(0.2, 0.16), // left shoulder
    P(0.03, 0.28), // left sleeve top
    P(0.11, 0.46), // left sleeve bottom
    P(0.26, 0.37), // left armpit
    P(0.26, 0.97), // left hem
    P(0.74, 0.97), // right hem
    P(0.74, 0.37), // right armpit
    P(0.89, 0.46), // right sleeve bottom
    P(0.97, 0.28), // right sleeve top
    P(0.8, 0.16), // right shoulder
    P(0.64, 0.08), // right neck
  ]
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  // collar dips to centre, back to the left neck point
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

function renderCanvas(teams: Team[], schedule: Match[], settings: Settings): HTMLCanvasElement {
  const height = computeHeight(teams, schedule)
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, height)

  const contentW = W - PAD * 2
  let y = PAD
  ctx.textBaseline = 'alphabetic'

  // --- Title ---
  ctx.textAlign = 'left'
  ctx.fillStyle = ACCENT
  ctx.font = font(30, 700)
  ctx.fillText('⚽ SQUADSORT', PAD, y + 30)
  ctx.fillStyle = TITLE
  ctx.font = font(68, 800)
  ctx.fillText('Team Line-ups', PAD, y + 100)
  ctx.fillStyle = MUTED
  ctx.font = font(30, 500)
  const total = teams.reduce((n, t) => n + t.players.length, 0)
  ctx.fillText(`${total} players · ${settings.targetSize}-a-side`, PAD, y + 146)
  y += TITLE_BLOCK

  // --- Teams ---
  for (const team of teams) {
    const rows = Math.max(1, nameRows(team.players.length))
    const blockH = TEAM_HEADER + rows * NAME_LINE + 16

    // Card + team-coloured edge
    ctx.fillStyle = CARD
    roundRect(ctx, PAD, y, contentW, blockH, 24)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = edgeFor(team.color.hex)
    roundRect(ctx, PAD + 1.5, y + 1.5, contentW - 3, blockH - 3, 22)
    ctx.stroke()

    // Jersey chip
    const chip = 78
    const chipX = PAD + 26
    const chipY = y + (TEAM_HEADER - chip) / 2
    ctx.fillStyle = CHIP
    roundRect(ctx, chipX, chipY, chip, chip, 18)
    ctx.fill()
    drawJersey(ctx, chipX + 10, chipY + 8, chip - 20, chip - 14, team.color.hex)

    // Team name + count
    const textX = chipX + chip + 26
    ctx.fillStyle = TITLE
    ctx.font = font(44, 800)
    ctx.textAlign = 'left'
    ctx.fillText(`Team ${team.color.name}`, textX, y + TEAM_HEADER / 2 + 8)
    ctx.textAlign = 'right'
    ctx.fillStyle = MUTED
    ctx.font = font(26, 600)
    ctx.fillText('PLAYERS', PAD + contentW - 92, y + TEAM_HEADER / 2 - 8)
    // Keep the count legible even for very dark kit colours (e.g. Black).
    ctx.fillStyle = luminance(team.color.dotHex) < 0.15 ? '#e4e4e7' : team.color.dotHex
    ctx.font = font(48, 800)
    ctx.fillText(`${team.players.length}`, PAD + contentW - 34, y + TEAM_HEADER / 2 + 14)
    ctx.textAlign = 'left'

    // Divider under header
    ctx.strokeStyle = '#27272a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(PAD + 24, y + TEAM_HEADER)
    ctx.lineTo(PAD + contentW - 24, y + TEAM_HEADER)
    ctx.stroke()

    // Players (two columns)
    const colW = (contentW - 72) / NAME_COLS
    team.players.forEach((name, i) => {
      const col = i % NAME_COLS
      const row = Math.floor(i / NAME_COLS)
      const nx = PAD + 36 + col * colW
      const ny = y + TEAM_HEADER + row * NAME_LINE + 40
      dot(ctx, nx + 6, ny - 10, 8, team.color.dotHex)
      ctx.fillStyle = NAME_COLOR
      ctx.font = font(32, 500)
      ctx.fillText(truncate(ctx, `${i + 1}. ${name}`, colW - 44), nx + 28, ny)
    })

    y += blockH + TEAM_GAP
  }

  // --- Schedule ---
  if (schedule.length > 0) {
    ctx.fillStyle = TITLE
    ctx.font = font(40, 800)
    ctx.fillText('Match Schedule', PAD, y + 44)
    y += SCHED_TITLE

    for (const m of schedule) {
      const home = teams[m.home]
      const away = teams[m.away]
      let x = PAD

      ctx.fillStyle = '#27272a'
      roundRect(ctx, x, y - 30, 40, 40, 10)
      ctx.fill()
      ctx.fillStyle = ACCENT
      ctx.font = font(24, 700)
      ctx.textAlign = 'center'
      ctx.fillText(`${m.index}`, x + 20, y - 2)
      ctx.textAlign = 'left'
      x += 60

      dot(ctx, x + 9, y - 12, 10, home.color.dotHex)
      x += 30
      ctx.fillStyle = NAME_COLOR
      ctx.font = font(32, 700)
      ctx.fillText(home.color.name, x, y)
      x += ctx.measureText(home.color.name).width + 16
      ctx.fillStyle = MUTED
      ctx.font = font(28, 500)
      ctx.fillText('vs', x, y)
      x += ctx.measureText('vs').width + 16
      dot(ctx, x + 9, y - 12, 10, away.color.dotHex)
      x += 30
      ctx.fillStyle = NAME_COLOR
      ctx.font = font(32, 700)
      ctx.fillText(away.color.name, x, y)
      x += ctx.measureText(away.color.name).width + 20

      const rest = m.resting.map((id) => teams[id].color.name).join(', ')
      if (rest) {
        ctx.fillStyle = MUTED
        ctx.font = font(26, 500)
        ctx.fillText(`· ${rest} rest${m.resting.length === 1 ? 's' : ''}`, x, y)
      }
      y += MATCH_LINE

      if (m.borrow) {
        const b = m.borrow
        ctx.fillStyle = AMBER
        ctx.font = font(28, 600)
        ctx.fillText(
          `↳ ${teams[b.borrowerTeamId].color.name} borrows ${b.count} from ${teams[b.fromTeamId].color.name}`,
          PAD + 60,
          y,
        )
        y += SUB_LINE
      } else if (m.note) {
        ctx.fillStyle = AMBER
        ctx.font = font(26, 500)
        ctx.fillText(`⚠ ${m.note}`, PAD + 60, y)
        y += SUB_LINE
      }
    }
  }

  // --- Footer ---
  ctx.fillStyle = MUTED
  ctx.font = font(26, 500)
  ctx.fillText('Made with SquadSort', PAD, y + 40)

  return canvas
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
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

/** Build the image and share it (or download it as a fallback). */
export async function shareTeamsImage(
  teams: Team[],
  schedule: Match[],
  settings: Settings,
): Promise<ShareOutcome> {
  if (teams.length === 0) return 'failed'

  const canvas = renderCanvas(teams, schedule, settings)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return 'failed'

  const filename = 'squadsort-teams.png'
  const file = new File([blob], filename, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean
    share?: (data?: unknown) => Promise<void>
  }

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'SquadSort Teams', text: 'Teams & schedule ⚽' })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
      // otherwise fall through to download
    }
  }

  download(blob, filename)
  return 'downloaded'
}
