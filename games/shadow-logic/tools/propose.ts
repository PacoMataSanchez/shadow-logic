/**
 * La parte del generador que SÍ sabe qué es un molde de habitación.
 *
 * El bucle proponer→resolver→validar→aceptar vive en `@puzzle/authoring`. Aquí
 * queda solo `propose()`: colocar pistas, salida, placas, agujeros y posiciones
 * iniciales dentro de una planta dibujada a mano.
 *
 * Método de autoría (A-07): la generación libre produce puzzles correctos pero
 * no habitaciones creíbles. El autor dibuja la planta y, con las **zonas**, dice
 * en qué sala va cada cosa; el generador decide la casilla exacta.
 */

import type { Rng } from '@puzzle/authoring'

import * as SL from '../src/engine/index.js'
import type { GenSpec, Mold } from './mold.js'

export function freeCells(mold: Mold): SL.Pos[] {
  const out: SL.Pos[] = []
  for (const [r, line] of mold.grid.entries()) {
    for (let c = 0; c < line.length; c++) {
      if (line[c] === SL.TERRENO.SUELO) out.push([r, c])
    }
  }
  return out
}

function zoneAt(mold: Mold, p: SL.Pos): string {
  if (!mold.zones) return '.'
  return mold.zones[p[0]]?.[p[1]] ?? '.'
}

function doorPositions(mold: Mold): SL.Pos[] {
  const out: SL.Pos[] = []
  for (const [r, line] of mold.grid.entries()) {
    for (let c = 0; c < line.length; c++) {
      if (line[c] === SL.TERRENO.PUERTA) out.push([r, c])
    }
  }
  return out
}

export function proposeLevel(spec: GenSpec, rng: Rng): SL.Level {
  const mold = spec.mold
  const pool = rng.shuffled(freeCells(mold))
  const used = new Set<SL.PosKey>()

  const take = (zoneSpec?: string): SL.Pos => {
    for (const p of pool) {
      const k = SL.key(p)
      if (used.has(k)) continue
      if (zoneSpec !== undefined && !zoneSpec.includes(zoneAt(mold, p))) continue
      used.add(k)
      return p
    }
    throw new Error(`molde "${mold.id}": sin casillas libres para la zona "${zoneSpec ?? '*'}"`)
  }

  // Orden de reparto: primero lo más restringido. Si las pistas se sirvieran
  // antes que la placa podrían agotar su zona y dejar el molde sin sitio.
  const pl = spec.placement ?? {}
  const plates: SL.Pos[] = []
  for (let n = 0; n < (spec.plates ?? 0); n++) plates.push(take(pl.plates))
  const holes: SL.Pos[] = []
  for (let n = 0; n < (spec.holes ?? 0); n++) holes.push(take(pl.holes))
  const exit = take(pl.exit)
  const clues: SL.Pos[] = []
  for (let n = 0; n < spec.clues; n++) clues.push(take(pl.clues))
  const playerStart = take(pl.player)
  const shadowStart = take(pl.shadow)

  const rows = mold.grid.map((l) => l.split(''))
  const put = (p: SL.Pos, ch: string): void => {
    const row = rows[p[0]]
    if (row) row[p[1]] = ch
  }
  put(exit, SL.TERRENO.SALIDA)
  for (const p of clues) put(p, SL.TERRENO.PISTA)
  for (const p of holes) put(p, SL.TERRENO.AGUJERO)
  for (const p of plates) put(p, SL.TERRENO.PLACA)

  const plateDefs: SL.PlateDef[] = plates.map((p, n) => ({ id: `p${n + 1}`, pos: p }))
  const doorDefs: SL.DoorDef[] = doorPositions(mold).map((pos, n) => ({
    id: mold.doorIds?.[n] ?? `d${n + 1}`,
    pos,
    controlledBy: plateDefs.length > 0 ? [plateDefs[0]!.id] : [],
    logic: 'OR' as const,
  }))

  return {
    id: spec.levelId,
    case: mold.case,
    title: spec.title ?? mold.title,
    place: mold.place,
    grid: rows.map((r) => r.join('')),
    playerStart,
    shadowStart,
    doors: doorDefs,
    plates: plateDefs,
    ...(mold.darkGroups ? { darkGroups: mold.darkGroups } : {}),
    ...(mold.switchGroups ? { switchGroups: mold.switchGroups } : {}),
    ...(mold.lightsOn ? { lightsOn: [...mold.lightsOn] } : {}),
    ...(spec.tutorial ? { tutorial: true } : {}),
    ...(spec.hintText ? { hintText: spec.hintText } : {}),
  }
}
