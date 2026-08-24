/**
 * Prototipo jugable — la pantalla de juego de la carcasa, con Shadow Logic dentro.
 *
 * Aquí no hay ni una regla. Todo lo que decide algo viene de:
 *   · el motor, a través del contrato          (@game/shadow-logic)
 *   · la sesión, las pistas y el reloj          (@game/shell)
 *   · las estrellas y PERFECTO                  (@game/core + manifiesto)
 *
 * Este fichero solo escucha dedos y pinta.
 */

import { evaluate, type PreviewMode } from '@game/core'
import {
  EMPTY_PROGRESS,
  isUnlocked,
  LevelController,
  migrate,
  NOIR,
  recordLevel,
  TelemetryQueue,
  totalStars,
  type Progress,
} from '@game/shell'
import { shadowLogic } from '@game/shadow-logic'
import { LEVELS } from '../../../games/shadow-logic/src/levels/loader.js'
import type { SLFx } from '../../../games/shadow-logic/src/adapter.js'
import type { Direccion, Estado, Level } from '../../../games/shadow-logic/src/engine/index.js'
import { animDuration, drawBoard, drawPreview, type Anim } from '../../../games/shadow-logic/render/board.js'
import { SHADOW_LOGIC_MANIFEST as MANIFEST } from './manifest.js'

const KEY = 'shadow-logic.progress.v1'
const now = (): number => performance.now()

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

// ── estado de la app ────────────────────────────────────────────────────────

let progress: Progress = load()
let previewMode: PreviewMode = (progress.settings['preview'] as PreviewMode) ?? MANIFEST.settings.preview.default
let level: Level | null = null
let ctl: LevelController<Level, Estado, Direccion, SLFx> | null = null
let anim: Anim | null = null
let previewFx: { fx: SLFx; dangerous: boolean } | null = null
let raf = 0

const telemetry = new TelemetryQueue(MANIFEST, () => Date.now())
telemetry.setConsent(true) // en el prototipo no sale del dispositivo

// ── persistencia (por visitante, y tolerante a que no exista) ───────────────

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? migrate(JSON.parse(raw)) : EMPTY_PROGRESS
  } catch {
    return EMPTY_PROGRESS
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    /* modo privado, cuota, o un navegador que bloquea: se juega igual */
  }
}

// ── mapa de casos ───────────────────────────────────────────────────────────

const ids = LEVELS.map((l) => l.id)

function renderMap(): void {
  const grid = $('grid')
  grid.innerHTML = ''
  LEVELS.forEach((l, i) => {
    const rec = progress.levels[l.id]
    const open = isUnlocked(progress, ids, l.id, MANIFEST.content.unlock.rule, MANIFEST.content.unlock.starsRequired)
    const card = document.createElement('button')
    card.className = `card${open ? '' : ' locked'}${rec?.perfect ? ' perfect' : ''}`
    card.disabled = !open
    card.innerHTML = `
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <span class="name">${l.title}</span>
      <span class="stars">${stars(rec?.stars ?? 0)}</span>
      <span class="par">${open ? `óptimo ${l.optimalMoves}` : 'cerrado'}</span>`
    card.onclick = () => open && openLevel(i)
    grid.appendChild(card)
  })
  $('total').textContent = `${totalStars(progress)} / ${LEVELS.length * 3}`
  show('map')
}

const stars = (n: number): string => '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n)

function show(screen: 'map' | 'game'): void {
  $('screen-map').hidden = screen !== 'map'
  $('screen-game').hidden = screen !== 'game'
}

// ── partida ─────────────────────────────────────────────────────────────────

function openLevel(i: number): void {
  level = LEVELS[i] as Level
  ctl = new LevelController(shadowLogic, level, { manifest: MANIFEST, now, telemetry })
  anim = null
  previewFx = null
  telemetry.record('levelStart', { level: level.id })

  $('case-title').textContent = level.title
  $('case-place').textContent = level.place ?? ''
  $('hint-line').textContent = ''
  $('overlay').hidden = true
  show('game')
  resize()
  syncHud()
  draw()
}

function syncHud(): void {
  if (!ctl || !level) return
  const v = ctl.view
  const cl = countClues(level, v.state)
  $('moves').textContent = String(v.moves)
  $('par').textContent = String(level.optimalMoves ?? '—')
  $('clues').textContent = `${cl.done}/${cl.total}`
  $('time').textContent = fmt(v.elapsedMs)
  $('undo').toggleAttribute('disabled', !v.canUndo)
  $('preview-mode').textContent = previewMode
}

function countClues(l: Level, e: Estado): { done: number; total: number } {
  let total = 0
  for (const line of l.grid) for (const ch of line) if (ch === '*') total++
  return { done: e.got.size, total }
}

const fmt = (ms: number): string => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ── entrada ─────────────────────────────────────────────────────────────────

function play(dir: Direccion): void {
  if (!ctl || !level || anim) return
  if (ctl.view.won) return
  const prev = ctl.view.state
  const r = ctl.play(dir)
  previewFx = null

  if (r.kind === 'nothing') {
    bump()
    return
  }
  const fx = (r.fx ?? { path: [prev.det] }) as SLFx
  anim = { prev, fx, failed: r.kind === 'failed', startedAt: now() }
  syncHud()
  loop()

  const dur = animDuration(fx)
  window.setTimeout(() => {
    anim = null
    syncHud()
    draw()
    if (ctl?.view.won) win()
  }, dur + 40)
}

/** Un input nulo no cuenta (S-01), pero el tablero debe acusar el golpe. */
function bump(): void {
  const el = $('board-wrap')
  el.classList.remove('bump')
  void el.offsetWidth
  el.classList.add('bump')
}

function win(): void {
  if (!ctl || !level) return
  const summary = ctl.summary
  const outcome = evaluate(MANIFEST, level.optimalMoves, summary, true)

  progress = recordLevel(
    progress,
    level.id,
    {
      stars: outcome.stars,
      perfect: outcome.perfect,
      bestScore: summary.score,
      ...(summary.elapsedMs !== undefined ? { bestMs: summary.elapsedMs } : {}),
      completedAt: Date.now(),
    },
    MANIFEST.progression.scoreDirection === 'lower-is-better',
  )
  progress = { ...progress, xp: progress.xp + outcome.xp }
  save()

  $('win-stars').textContent = stars(outcome.stars)
  $('win-title').textContent = outcome.perfect ? 'CASO PERFECTO' : 'CASO CERRADO'
  $('win-detail').textContent =
    `${summary.score} movimientos · óptimo ${level.optimalMoves} · ${fmt(summary.elapsedMs ?? 0)}` +
    (summary.usedHints > 0 ? ` · ${summary.usedHints} pista(s)` : '')
  const i = LEVELS.findIndex((l) => l.id === level?.id)
  $('next').hidden = i < 0 || i + 1 >= LEVELS.length
  $('overlay').hidden = false
}

// ── previsualización (S-14) ─────────────────────────────────────────────────

function preview(dir: Direccion | null): void {
  if (!ctl || anim || previewMode === 'none' || dir === null) {
    previewFx = null
    draw()
    return
  }
  const p = ctl.preview(dir, previewMode)
  previewFx = p.visible && p.result.kind !== 'nothing'
    ? { fx: (p.result.fx ?? { path: [] }) as SLFx, dangerous: p.dangerous }
    : null
  draw()
}

// ── dibujo ──────────────────────────────────────────────────────────────────

const canvas = () => $('board') as unknown as HTMLCanvasElement

function resize(): void {
  const c = canvas()
  const wrap = $('board-wrap')
  const dpr = Math.min(3, window.devicePixelRatio || 1)
  const size = Math.min(wrap.clientWidth, wrap.clientHeight)
  c.width = Math.floor(size * dpr)
  c.height = Math.floor(size * dpr)
  c.style.width = `${size}px`
  c.style.height = `${size}px`
  const ctx = c.getContext('2d')
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw()
}

function draw(): void {
  if (!level || !ctl) return
  const c = canvas()
  const ctx = c.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(3, window.devicePixelRatio || 1)
  const px = { w: c.width / dpr, h: c.height / dpr }
  const running = drawBoard(ctx, level, ctl.view.state, NOIR.board, anim, now(), px)
  if (previewFx && !anim) drawPreview(ctx, level, previewFx.fx, previewFx.dangerous, NOIR.board, px)
  if (running && !raf) loop()
}

function loop(): void {
  cancelAnimationFrame(raf)
  const tick = (): void => {
    draw()
    raf = anim ? requestAnimationFrame(tick) : 0
  }
  raf = requestAnimationFrame(tick)
}

// ── gestos y teclado ────────────────────────────────────────────────────────

const DIRS: Record<string, Direccion> = {
  ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
  w: 'U', s: 'D', a: 'L', d: 'R',
}

function wireInput(): void {
  const el = $('board-wrap')
  let start: { x: number; y: number } | null = null

  const dirOf = (dx: number, dy: number): Direccion | null => {
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return null
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U'
  }

  el.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY }
    el.setPointerCapture(e.pointerId)
  })
  el.addEventListener('pointermove', (e) => {
    if (!start) return
    preview(dirOf(e.clientX - start.x, e.clientY - start.y))
  })
  const end = (e: PointerEvent): void => {
    if (!start) return
    const dir = dirOf(e.clientX - start.x, e.clientY - start.y)
    start = null
    previewFx = null
    // S-14: si se vuelve al centro antes de soltar, no se consume movimiento.
    if (dir) play(dir)
    else draw()
  }
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', () => { start = null; previewFx = null; draw() })

  window.addEventListener('keydown', (e) => {
    if ($('screen-game').hidden) return
    const dir = DIRS[e.key]
    if (dir) { e.preventDefault(); play(dir) }
    if (e.key === 'z') doUndo()
    if (e.key === 'r') doRestart()
  })
  window.addEventListener('resize', resize)
}

// ── acciones del HUD ────────────────────────────────────────────────────────

function doUndo(): void {
  if (!ctl || anim) return
  ctl.undo()
  syncHud()
  draw()
}

function doRestart(): void {
  if (!ctl || anim) return
  ctl.restart()
  $('hint-line').textContent = ''
  syncHud()
  draw()
}

function doHint(): void {
  if (!ctl || !level) return
  const h = ctl.hint((level.solutionPath ?? []) as Direccion[])
  const line = $('hint-line')
  if (h.kind === 'concept') line.textContent = `“${h.text}”`
  else if (h.kind === 'moves') {
    const names: Record<Direccion, string> = { U: 'arriba', D: 'abajo', L: 'izquierda', R: 'derecha' }
    line.textContent =
      h.label === 'next'
        ? `“Hacia ${names[h.moves[0] as Direccion]}. Y no me lo hagas repetir.”`
        : `“Toma, todo menos el último paso: ${h.moves.map((m) => names[m as Direccion]).join(', ')}. El final lo cierras tú.”`
  } else line.textContent = `“${h.reason}. Apáñate.”`
  syncHud()
}

function cyclePreview(): void {
  const modes = MANIFEST.settings.preview.modes
  previewMode = modes[(modes.indexOf(previewMode) + 1) % modes.length] as PreviewMode
  progress = { ...progress, settings: { ...progress.settings, preview: previewMode } }
  save()
  telemetry.record('previewModeChanged', { mode: previewMode })
  syncHud()
}

// ── arranque ────────────────────────────────────────────────────────────────

function boot(): void {
  wireInput()
  $('undo').onclick = doUndo
  $('restart').onclick = doRestart
  $('hint').onclick = doHint
  $('preview-btn').onclick = cyclePreview
  $('back').onclick = () => { renderMap() }
  $('again').onclick = () => { $('overlay').hidden = true; doRestart() }
  $('next').onclick = () => {
    const i = LEVELS.findIndex((l) => l.id === level?.id)
    $('overlay').hidden = true
    if (i >= 0 && i + 1 < LEVELS.length) openLevel(i + 1)
  }
  $('to-map').onclick = () => { $('overlay').hidden = true; renderMap() }

  window.setInterval(() => { if (!$('screen-game').hidden && ctl && !ctl.view.won) syncHud() }, 500)
  renderMap()
}

boot()
