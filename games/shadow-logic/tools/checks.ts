/**
 * Las validaciones que SÍ saben qué es una sombra.
 *
 * Las genéricas —resolubilidad, estados atrapa, justicia a ciegas, métrica de
 * pasillo— viven en `@puzzle/authoring`. Aquí quedan las tres que hablan del
 * vocabulario de Shadow Logic: relevancia de la sombra, integridad de datos y
 * salida alcanzable.
 *
 * Que se puedan separar así es la prueba de que la frontera está bien puesta.
 */

import { relevanceOf, type Check, type LevelCheck } from '@puzzle/authoring'

import * as SL from '../src/engine/index.js'
import type { SLFx } from '../src/adapter.js'

type SLCheck = LevelCheck<SL.Level, SL.Estado, SL.Direccion, SLFx>

/**
 * Validación 2 — relevancia de la sombra.
 * El handicap es quitarla de raíz: si el nivel se resuelve igual sin ella, la
 * sombra es decorado. Exenta en los niveles `tutorial: true`.
 */
export const relevance: SLCheck = relevanceOf<SL.Level, SL.Estado, SL.Direccion, SLFx>(
  (game, level) => ({ ...game.initialState(level), sha: null, shaAbsent: false }),
  'la sombra',
  (level) => level.tutorial === true,
)

/** Validación 4 — integridad de datos. */
export const integrity: SLCheck = ({ level }) => {
  const cl = SL.compile(level)
  const problems: string[] = []

  if (cl.rows === 0 || cl.cols === 0) problems.push('grid vacío')
  for (const [i, line] of level.grid.entries()) {
    if (line.length !== cl.cols) problems.push(`fila ${i} mide ${line.length}, se esperaba ${cl.cols}`)
    for (const ch of line) {
      if (!SL.TERRENOS_VALIDOS.has(ch)) problems.push(`carácter desconocido "${ch}"`)
    }
  }

  for (const [nombre, p] of [
    ['playerStart', level.playerStart],
    ['shadowStart', level.shadowStart],
  ] as const) {
    if (!SL.inBounds(cl, p)) problems.push(`${nombre} fuera del tablero`)
    else {
      const t = SL.terrainAt(cl, p)
      if (t === SL.TERRENO.PARED) problems.push(`${nombre} empieza dentro de una pared`)
      if (t === SL.TERRENO.AGUJERO) problems.push(`${nombre} empieza dentro de un agujero`)
      if (t === SL.TERRENO.PUERTA) problems.push(`${nombre} empieza dentro de una puerta`)
    }
  }
  if (SL.key(level.playerStart) === SL.key(level.shadowStart)) {
    problems.push('detective y sombra comparten casilla inicial')
  }

  if (cl.exit === null) problems.push('el nivel no tiene salida')
  if (cl.clueCount === 0) problems.push('el nivel no tiene pistas')

  for (const d of level.doors ?? []) {
    if (SL.terrainAt(cl, d.pos) !== SL.TERRENO.PUERTA) problems.push(`puerta ${d.id} no está sobre "+"`)
    for (const pid of d.controlledBy) {
      if (!cl.plateById.has(pid)) problems.push(`puerta ${d.id} referencia la placa inexistente "${pid}"`)
    }
  }
  for (const p of level.plates ?? []) {
    if (SL.terrainAt(cl, p.pos) !== SL.TERRENO.PLACA) problems.push(`placa ${p.id} no está sobre "_"`)
  }

  // La oscuridad es propiedad de la casilla, ortogonal a su terreno: `x` es solo
  // el marcador de «suelo llano apagable». Una placa también puede apagarse —
  // S-19 dice que una sombra ausente no puede sostenerla desde la oscuridad, así
  // que el caso tiene que ser expresable.
  for (const k of Object.keys(level.darkGroups ?? {})) {
    const t = SL.terrainAt(cl, parsePos(k))
    if (t === SL.TERRENO.PARED || t === SL.TERRENO.PUERTA) {
      problems.push(`darkGroups apunta a ${k}, que no es una casilla transitable`)
    }
  }
  for (const k of Object.keys(level.switchGroups ?? {})) {
    if (SL.terrainAt(cl, parsePos(k)) !== SL.TERRENO.INTERRUPTOR) {
      problems.push(`switchGroups apunta a ${k}, que no es "!"`)
    }
  }
  const groups = new Set(Object.values(level.switchGroups ?? {})).size
  if (groups > 3) problems.push(`${groups} grupos de interruptor: el Rulebook fija un máximo de 3`)

  return {
    n: 4,
    name: 'Integridad de datos',
    ok: problems.length === 0,
    detail: problems.length === 0 ? 'coordenadas, terreno y vínculos correctos' : problems.join(' · '),
  }
}

/**
 * Validación 6 — la salida necesita un tope detrás.
 *
 * Nació de un fallo real: al enmendar S-07 y quitar el freno mágico de la salida,
 * siete de los ocho niveles del Caso 01 quedaron irresolubles de golpe.
 *
 * Comprobación estructural y barata, para dar un error legible antes del BFS. La
 * autoritativa sigue siendo la validación 1.
 */
export const exitStoppable: SLCheck = ({ level }) => {
  const cl = SL.compile(level)
  if (cl.exit === null) {
    return { n: 6, name: 'Salida alcanzable', ok: false, detail: 'el nivel no tiene salida' }
  }
  const reasons: string[] = []
  for (const dir of SL.DIRECCIONES) {
    const d = SL.DELTA[dir]
    const behind: SL.Pos = [cl.exit[0] + d[0], cl.exit[1] + d[1]]
    if (!SL.inBounds(cl, behind)) {
      reasons.push(`${dir}: borde`)
      continue
    }
    const t = SL.terrainAt(cl, behind)
    if (t === SL.TERRENO.PARED) reasons.push(`${dir}: pared`)
    else if (t === SL.TERRENO.PUERTA) reasons.push(`${dir}: puerta`)
    else if (t !== SL.TERRENO.AGUJERO) reasons.push(`${dir}: la sombra puede hacer de tope`)
  }
  return {
    n: 6,
    name: 'Salida alcanzable',
    ok: reasons.length > 0,
    detail:
      reasons.length > 0
        ? `topes posibles — ${reasons.join(', ')}`
        : 'la salida no tiene ningún tope: inalcanzable',
  }
}

/** Las tres, en el orden en que las numera el Rulebook. */
export const SHADOW_LOGIC_CHECKS: readonly SLCheck[] = [relevance, integrity, exitStoppable]

function parsePos(k: string): SL.Pos {
  const [r, c] = k.split(',')
  return [Number(r), Number(c)]
}

export type { Check }
