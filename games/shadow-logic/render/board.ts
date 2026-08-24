/**
 * El renderizador del tablero. **Del juego, no de la carcasa.**
 *
 * Recibe un `Estado` y lo dibuja. No decide nada: la animación nunca altera el
 * estado (paso 8 del turno). La carcasa monta este lienzo dentro de su pantalla
 * de juego y le pone el HUD alrededor sin saber qué está dibujando.
 *
 * Dos reglas de lectura que vienen del Rulebook y que el dibujo debe respetar:
 *
 * - **El empujón se anima DESPUÉS de que el detective se detenga**, nunca a la
 *   vez. Son dos hechos consecutivos y leerlos como simultáneos rompe la
 *   comprensión de S-03.
 * - **Sombra ausente y sombra caída son estados distintos.** La ausente vuelve;
 *   la caída no. Confundirlos rompe S-19.
 */

import type { BoardSkin } from '@game/core'

import * as SL from '../src/engine/index.js'
import type { SLFx } from '../src/adapter.js'

export interface Anim {
  /** Estado ANTERIOR al turno: durante la animación se dibuja el mundo de antes. */
  readonly prev: SL.Estado
  readonly fx: SLFx
  readonly failed: boolean
  readonly startedAt: number
}

const MS_PER_CELL = 42
const PUSH_GAP = 60

export function animDuration(fx: SLFx): number {
  const det = Math.max(0, fx.path.length - 1) * MS_PER_CELL
  const sha = fx.shadowPath ? PUSH_GAP + Math.max(0, fx.shadowPath.length - 1) * MS_PER_CELL : 0
  return Math.max(160, det + sha)
}

interface Skin {
  floor: string; floorAlt: string; wall: string; wallEdge: string
  detective: string; shadow: string; shadowAbsent: string
  clue: string; exit: string; hole: string; filled: string
  plate: string; door: string; dark: string; switch: string
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  level: SL.Level,
  state: SL.Estado,
  skin: BoardSkin,
  anim: Anim | null,
  now: number,
  px: { w: number; h: number },
): boolean {
  const s = skin as unknown as Skin
  const cl = SL.compile(level)
  const cell = Math.floor(Math.min(px.w / cl.cols, px.h / cl.rows))
  const ox = Math.floor((px.w - cell * cl.cols) / 2)
  const oy = Math.floor((px.h - cell * cl.rows) / 2)

  // Durante la animación el mundo que se ve es el de ANTES: si no, la pista
  // desaparecería en el instante en que el jugador desliza, antes de llegar.
  const world = anim ? anim.prev : state
  const doorsOpen = SL.freezeDoors(cl, world)

  ctx.clearRect(0, 0, px.w, px.h)

  for (let r = 0; r < cl.rows; r++) {
    for (let c = 0; c < cl.cols; c++) {
      const p: SL.Pos = [r, c]
      const k = SL.key(p)
      const t = SL.terrainAt(cl, p)
      const x = ox + c * cell
      const y = oy + r * cell

      if (t === SL.TERRENO.PARED) {
        roundRect(ctx, x, y, cell, cell, cell * 0.07, s.wall)
        ctx.fillStyle = s.wallEdge
        ctx.fillRect(x, y, cell, Math.max(1, cell * 0.05))
        continue
      }

      // suelo, con damero muy suave para que la rejilla se lea sin marcarla
      ctx.fillStyle = (r + c) % 2 === 0 ? s.floor : s.floorAlt
      ctx.fillRect(x, y, cell, cell)
      ctx.strokeStyle = 'rgba(255,255,255,.035)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1)

      const dark = SL.isDark(cl, p, world.lights)
      if (dark) {
        ctx.fillStyle = s.dark
        ctx.globalAlpha = 0.82 // translúcida: el suelo se ve debajo, la pared no
        ctx.fillRect(x, y, cell, cell)
        ctx.globalAlpha = 1
      }

      switch (t) {
        case SL.TERRENO.AGUJERO:
          if (world.filled.has(k)) {
            roundRect(ctx, x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, cell * 0.1, s.filled)
          } else {
            ctx.beginPath()
            ctx.arc(x + cell / 2, y + cell / 2, cell * 0.36, 0, Math.PI * 2)
            ctx.fillStyle = s.hole
            ctx.fill()
          }
          break

        case SL.TERRENO.PISTA:
          if (!world.got.has(k)) drawClue(ctx, x, y, cell, s.clue)
          break

        case SL.TERRENO.SALIDA:
          drawExit(ctx, x, y, cell, s.exit, allCollected(cl, world))
          break

        case SL.TERRENO.PLACA: {
          const pressed = world.sha !== null && !world.shaAbsent && SL.key(world.sha) === k
          ctx.strokeStyle = s.plate
          ctx.lineWidth = Math.max(2, cell * 0.07)
          ctx.strokeRect(x + cell * 0.2, y + cell * 0.2, cell * 0.6, cell * 0.6)
          if (pressed) {
            ctx.fillStyle = s.plate
            ctx.fillRect(x + cell * 0.28, y + cell * 0.28, cell * 0.44, cell * 0.44)
          }
          break
        }

        case SL.TERRENO.PUERTA: {
          const open = doorsOpen.has(k)
          ctx.fillStyle = s.door
          ctx.globalAlpha = open ? 0.28 : 1
          ctx.fillRect(x + cell * 0.06, y + cell * 0.06, cell * 0.88, cell * 0.88)
          ctx.globalAlpha = 1
          break
        }

        case SL.TERRENO.INTERRUPTOR:
          ctx.fillStyle = s.switch
          ctx.fillRect(x + cell * 0.34, y + cell * 0.24, cell * 0.32, cell * 0.52)
          break

        default:
          break
      }
    }
  }

  // ── entidades ─────────────────────────────────────────────────────────────
  const at = (p: SL.Pos): { x: number; y: number } => ({
    x: ox + p[1] * cell + cell / 2,
    y: oy + p[0] * cell + cell / 2,
  })

  let running = false
  let detPos = at(state.det)
  let shaPos = state.sha ? at(state.sha) : null
  let shaVisible = state.sha !== null && !state.shaAbsent
  let sinking = 0

  if (anim) {
    const el = now - anim.startedAt
    const detMs = Math.max(0, anim.fx.path.length - 1) * MS_PER_CELL
    const shaMs = anim.fx.shadowPath ? Math.max(0, anim.fx.shadowPath.length - 1) * MS_PER_CELL : 0

    // Fase 1: el detective se desliza. La sombra sigue donde estaba.
    detPos = lerpPath(anim.fx.path, Math.min(1, detMs === 0 ? 1 : el / detMs), at)
    shaVisible = anim.prev.sha !== null && !anim.prev.shaAbsent
    shaPos = anim.prev.sha ? at(anim.prev.sha) : null

    // Fase 2: sólo cuando el detective ya ha parado, sale la sombra (S-03).
    if (anim.fx.shadowPath && el > detMs + PUSH_GAP) {
      const u = shaMs === 0 ? 1 : Math.min(1, (el - detMs - PUSH_GAP) / shaMs)
      shaPos = lerpPath(anim.fx.shadowPath, u, at)
      if (anim.fx.sunk && u >= 1) sinking = 1
    }
    running = el < animDuration(anim.fx)
    if (anim.failed && el > detMs * 0.7) sinking = 0
  }

  if (shaVisible && shaPos) drawShadow(ctx, shaPos.x, shaPos.y, cell, s.shadow, sinking)
  else if (state.sha !== null && state.shaAbsent && !anim) {
    // Ausente por falta de luz: sigue ahí, pero no está. Distinta de la caída.
    const p = at(state.sha)
    drawShadow(ctx, p.x, p.y, cell, s.shadowAbsent, 0, true)
  }
  drawDetective(ctx, detPos.x, detPos.y, cell, s.detective, anim?.failed === true && sinking === 0)

  return running
}

function allCollected(cl: SL.CompiledLevel, e: SL.Estado): boolean {
  for (const k of cl.clues) if (!e.got.has(k)) return false
  return true
}

function lerpPath(
  path: readonly SL.Pos[],
  u: number,
  at: (p: SL.Pos) => { x: number; y: number },
): { x: number; y: number } {
  if (path.length === 0) return { x: 0, y: 0 }
  const segs = path.length - 1
  if (segs <= 0) return at(path[0] as SL.Pos)
  const eased = 1 - Math.pow(1 - u, 2.2) // frena al chocar, no al salir
  const f = eased * segs
  const i = Math.min(segs - 1, Math.floor(f))
  const t = f - i
  const a = at(path[i] as SL.Pos)
  const b = at(path[i + 1] as SL.Pos)
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function drawDetective(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, cell: number,
  color: string, falling: boolean,
): void {
  const rad = cell * (falling ? 0.16 : 0.3)
  ctx.beginPath()
  ctx.arc(x, y, rad, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  if (!falling) {
    // ala del sombrero: lo justo para que se lea «detective» a 30 px
    ctx.fillStyle = color
    ctx.fillRect(x - cell * 0.3, y - cell * 0.26, cell * 0.6, cell * 0.08)
  }
}

function drawShadow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, cell: number,
  color: string, sunk: number, ghost = false,
): void {
  const rad = cell * 0.3 * (1 - sunk * 0.7)
  ctx.save()
  if (ghost) ctx.setLineDash([cell * 0.09, cell * 0.07])
  ctx.beginPath()
  ctx.ellipse(x, y, rad, rad * 0.86, 0, 0, Math.PI * 2)
  if (ghost) {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1.5, cell * 0.05)
    ctx.stroke()
  } else {
    ctx.fillStyle = color
    ctx.fill()
  }
  ctx.restore()
}

function drawClue(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number, color: string): void {
  ctx.save()
  ctx.translate(x + cell / 2, y + cell / 2)
  ctx.rotate(Math.PI / 4)
  ctx.fillStyle = color
  const r = cell * 0.2
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()
}

function drawExit(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, cell: number,
  color: string, ready: boolean,
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, cell * 0.08)
  ctx.globalAlpha = ready ? 1 : 0.35
  ctx.strokeRect(x + cell * 0.16, y + cell * 0.16, cell * 0.68, cell * 0.68)
  if (ready) {
    ctx.globalAlpha = 0.18
    ctx.fillStyle = color
    ctx.fillRect(x + cell * 0.16, y + cell * 0.16, cell * 0.68, cell * 0.68)
  }
  ctx.globalAlpha = 1
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill: string,
): void {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** S-14 — el recorrido y la casilla de parada, dibujados sin aplicar nada. */
export function drawPreview(
  ctx: CanvasRenderingContext2D,
  level: SL.Level,
  fx: SLFx,
  dangerous: boolean,
  skin: BoardSkin,
  px: { w: number; h: number },
): void {
  const s = skin as unknown as Skin
  const cl = SL.compile(level)
  const cell = Math.floor(Math.min(px.w / cl.cols, px.h / cl.rows))
  const ox = Math.floor((px.w - cell * cl.cols) / 2)
  const oy = Math.floor((px.h - cell * cl.rows) / 2)

  const color = dangerous ? '#f85149' : s.detective
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.fillStyle = color
  for (const p of fx.path.slice(1)) {
    ctx.fillRect(ox + p[1] * cell + cell * 0.3, oy + p[0] * cell + cell * 0.3, cell * 0.4, cell * 0.4)
  }
  const end = fx.path[fx.path.length - 1]
  if (end) {
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(2, cell * 0.07)
    ctx.strokeRect(ox + end[1] * cell + 2, oy + end[0] * cell + 2, cell - 4, cell - 4)
  }
  ctx.restore()
}
