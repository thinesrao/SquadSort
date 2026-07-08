import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Team } from '../types'
import { swapPlayers, movePlayer } from '../lib/teamEdit'
import { vibrate, HAPTIC } from '../lib/haptics'

const LONG_PRESS_MS = 280
const MOVE_CANCEL_PX = 12

export interface Ghost {
  name: string
  x: number
  y: number
}

interface Source {
  teamId: number
  index: number
  name: string
  pointerId: number
  startX: number
  startY: number
}

/**
 * Long-press-to-drag for moving/swapping players between team columns.
 *
 * A player row is picked up after a short stationary long-press (which also
 * fires a haptic), then dragged over another column. Dropping on a specific
 * player swaps the two; dropping on empty column space moves the player.
 * Player rows should set `touch-action: none` so the drag isn't hijacked by
 * scrolling, and carry `data-player-key="teamId:index"`; columns carry
 * `data-team-col="teamId"`.
 */
export function usePlayerDrag(teams: Team[], onCommit: (t: Team[]) => void) {
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [overTeamId, setOverTeamId] = useState<number | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const teamsRef = useRef(teams)
  teamsRef.current = teams
  const commitRef = useRef(onCommit)
  commitRef.current = onCommit

  const srcRef = useRef<Source | null>(null)
  const activeRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const moveRef = useRef<((e: PointerEvent) => void) | null>(null)
  const upRef = useRef<((e: PointerEvent) => void) | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    activeRef.current = false
    srcRef.current = null
    setGhost(null)
    setOverTeamId(null)
    setActiveKey(null)
    if (moveRef.current) window.removeEventListener('pointermove', moveRef.current)
    if (upRef.current) {
      window.removeEventListener('pointerup', upRef.current)
      window.removeEventListener('pointercancel', upRef.current)
    }
    moveRef.current = null
    upRef.current = null
  }, [])

  const hitTest = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const playerEl = el?.closest('[data-player-key]') as HTMLElement | null
    const colEl = el?.closest('[data-team-col]') as HTMLElement | null
    return {
      key: playerEl?.dataset.playerKey ?? null,
      teamId: colEl?.dataset.teamCol != null ? Number(colEl.dataset.teamCol) : null,
    }
  }

  const startDrag = useCallback(
    (e: ReactPointerEvent, teamId: number, index: number, name: string) => {
      if (srcRef.current) return
      const src: Source = {
        teamId,
        index,
        name,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      }
      srcRef.current = src

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== src.pointerId) return
        if (!activeRef.current) {
          const dist = Math.hypot(ev.clientX - src.startX, ev.clientY - src.startY)
          if (dist > MOVE_CANCEL_PX) cleanup() // user is scrolling, not dragging
          return
        }
        ev.preventDefault()
        setGhost({ name: src.name, x: ev.clientX, y: ev.clientY })
        setOverTeamId(hitTest(ev.clientX, ev.clientY).teamId)
      }

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== src.pointerId) return
        if (activeRef.current) {
          const { key, teamId: dropTeam } = hitTest(ev.clientX, ev.clientY)
          let next: Team[] | null = null
          if (key) {
            const [t, i] = key.split(':').map(Number)
            if (!(t === src.teamId && i === src.index)) {
              next = swapPlayers(teamsRef.current, src.teamId, src.index, t, i)
            }
          } else if (dropTeam != null && dropTeam !== src.teamId) {
            next = movePlayer(teamsRef.current, src.teamId, src.index, dropTeam)
          }
          if (next) {
            vibrate(HAPTIC.tap)
            commitRef.current(next)
          }
        }
        cleanup()
      }

      moveRef.current = onMove
      upRef.current = onUp
      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)

      timerRef.current = window.setTimeout(() => {
        if (!srcRef.current) return
        activeRef.current = true
        setActiveKey(`${teamId}:${index}`)
        setGhost({ name, x: src.startX, y: src.startY })
        vibrate(HAPTIC.pickup)
      }, LONG_PRESS_MS)
    },
    [cleanup],
  )

  // Tidy up listeners if the component unmounts mid-drag.
  useEffect(() => cleanup, [cleanup])

  return { ghost, overTeamId, activeKey, dragging: activeKey != null, startDrag }
}
