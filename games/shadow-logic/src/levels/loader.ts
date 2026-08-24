/**
 * Carga de niveles — A-05.
 *
 * Los JSON se importan estáticamente para que el bundler de Expo los incluya en
 * el paquete: nada de `require()` dinámico ni de acceso al sistema de ficheros,
 * que en el dispositivo no existe.
 */

import type { Level } from '../engine/index.js'
import { parseLevel } from './schema.js'

import c1001 from './case01/001.json' with { type: 'json' }
import c1002 from './case01/002.json' with { type: 'json' }
import c1003 from './case01/003.json' with { type: 'json' }
import c1004 from './case01/004.json' with { type: 'json' }
import c1005 from './case01/005.json' with { type: 'json' }
import c1006 from './case01/006.json' with { type: 'json' }
import c1007 from './case01/007.json' with { type: 'json' }
import c1008 from './case01/008.json' with { type: 'json' }

const RAW: readonly unknown[] = [c1001, c1002, c1003, c1004, c1005, c1006, c1007, c1008]

/** Todos los niveles del juego, en orden de juego, ya validados de esquema. */
export const LEVELS: readonly Level[] = RAW.map(parseLevel)

export const CASES: ReadonlyMap<number, readonly Level[]> = groupByCase(LEVELS)

export function levelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id)
}

export function nextLevel(id: string): Level | undefined {
  const i = LEVELS.findIndex((l) => l.id === id)
  return i >= 0 ? LEVELS[i + 1] : undefined
}

function groupByCase(levels: readonly Level[]): Map<number, Level[]> {
  const out = new Map<number, Level[]>()
  for (const l of levels) {
    const bucket = out.get(l.case)
    if (bucket) bucket.push(l)
    else out.set(l.case, [l])
  }
  return out
}
