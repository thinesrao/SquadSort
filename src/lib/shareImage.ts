import type { Match, Settings, Team } from '../types'

/**
 * Render the teams + schedule to a PNG and share it (WhatsApp etc.) via the
 * Web Share API, falling back to a file download. The image is drawn entirely
 * with the Canvas API — no external libraries, and no dependency on Tailwind's
 * (oklch) computed colors — so it works offline and looks identical everywhere.
 */

export type ShareOutcome = 'shared' | 'downloaded' | 'failed'

// --- Layout constants (device-independent px) ---
const W = 1080
const PAD = 64
const BG = '#0b0b0e'
const CARD = '#18181b'
const TITLE = '#fafafa'
const MUTED = '#a1a1aa'
const NAME_COLOR = '#e4e4e7'
const AMBER = '#fbbf24'
const ACCENT = '#34d399'

const TITLE_BLOCK = 168
const TEAM_HEADER = 92
const NAME_LINE = 56
const TEAM_GAP = 28
const SCHED_TITLE = 96
const MATCH_LINE = 60
const SUB_LINE = 46
const FOOTER = 96
const NAME_COLS = 2

const font = (size: number, weight = 400) =>
  `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

const nameRows = (count: number) => Math.ceil(count / NAME_COLS)

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
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.stroke()
}

function renderCanvas(teams: Team[], schedule: Match[], settings: Settings): HTMLCanvasElement {
  const height = computeHeight(teams, schedule)
  const scale = 2 // draw at 2x for crisp text
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)

  // Background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W, height)

  let y = PAD
  ctx.textBaseline = 'alphabetic'

  // Title
  ctx.fillStyle = ACCENT
  ctx.font = font(30, 700)
  ctx.fillText('⚽ SQUADSORT', PAD, y + 30)
  ctx.fillStyle = TITLE
  ctx.font = font(68, 800)
  ctx.fillText('Team Line-ups', PAD, y + 96)
  ctx.fillStyle = MUTED
  ctx.font = font(30, 500)
  const total = teams.reduce((n, t) => n + t.players.length, 0)
  ctx.fillText(`${total} players · ${settings.targetSize}-a-side`, PAD, y + 140)
  y += TITLE_BLOCK

  const contentW = W - PAD * 2

  // Teams
  for (const team of teams) {
    const rows = Math.max(1, nameRows(team.players.length))
    const blockH = TEAM_HEADER + rows * NAME_LINE

    // Card
    ctx.fillStyle = CARD
    roundRect(ctx, PAD, y, contentW, blockH, 24)
    ctx.fill()

    // Colored header strip
    ctx.save()
    roundRect(ctx, PAD, y, contentW, TEAM_HEADER, 24)
    ctx.clip()
    ctx.fillStyle = team.color.hex
    ctx.fillRect(PAD, y, contentW, TEAM_HEADER)
    ctx.restore()

    ctx.fillStyle = team.color.textHex
    ctx.font = font(40, 800)
    ctx.fillText(`Team ${team.color.name}`, PAD + 32, y + 60)
    ctx.textAlign = 'right'
    ctx.font = font(38, 800)
    ctx.fillText(`${team.players.length}`, PAD + contentW - 32, y + 60)
    ctx.textAlign = 'left'

    // Player names in two columns
    const colW = (contentW - 64) / NAME_COLS
    team.players.forEach((name, i) => {
      const col = i % NAME_COLS
      const row = Math.floor(i / NAME_COLS)
      const nx = PAD + 32 + col * colW
      const ny = y + TEAM_HEADER + row * NAME_LINE + 38
      dot(ctx, nx + 6, ny - 10, 8, team.color.dotHex)
      ctx.fillStyle = NAME_COLOR
      ctx.font = font(32, 500)
      const label = `${i + 1}. ${name}`
      ctx.fillText(truncate(ctx, label, colW - 44), nx + 28, ny)
    })

    y += blockH + TEAM_GAP
  }

  // Schedule
  if (schedule.length > 0) {
    ctx.fillStyle = TITLE
    ctx.font = font(40, 800)
    ctx.fillText('Match Schedule', PAD, y + 44)
    y += SCHED_TITLE

    for (const m of schedule) {
      const home = teams[m.home]
      const away = teams[m.away]
      let x = PAD
      // index badge
      ctx.fillStyle = '#27272a'
      roundRect(ctx, x, y - 30, 40, 40, 10)
      ctx.fill()
      ctx.fillStyle = ACCENT
      ctx.font = font(24, 700)
      ctx.textAlign = 'center'
      ctx.fillText(`${m.index}`, x + 20, y - 2)
      ctx.textAlign = 'left'
      x += 60

      dot(ctx, x + 8, y - 12, 9, home.color.dotHex)
      x += 26
      ctx.fillStyle = NAME_COLOR
      ctx.font = font(32, 700)
      ctx.fillText(home.color.name, x, y)
      x += ctx.measureText(home.color.name).width + 16
      ctx.fillStyle = MUTED
      ctx.font = font(28, 500)
      ctx.fillText('vs', x, y)
      x += ctx.measureText('vs').width + 16
      dot(ctx, x + 8, y - 12, 9, away.color.dotHex)
      x += 26
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

  // Footer
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
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) return 'failed'

  const filename = 'squadsort-teams.png'
  const file = new File([blob], filename, { type: 'image/png' })

  const nav = navigator as Navigator & {
    canShare?: (data?: unknown) => boolean
    share?: (data?: unknown) => Promise<void>
  }

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: 'SquadSort Teams',
        text: 'Teams & schedule ⚽',
      })
      return 'shared'
    } catch (err) {
      // User dismissed the share sheet — treat as done, don't also download.
      if (err instanceof Error && err.name === 'AbortError') return 'shared'
      // Any other error: fall through to download.
    }
  }

  download(blob, filename)
  return 'downloaded'
}
