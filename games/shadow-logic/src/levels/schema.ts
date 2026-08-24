/**
 * Validación de esquema en carga — A-05.
 *
 * Los niveles son datos, nunca lógica. Esto es la aduana: si un JSON está mal
 * formado, la app tiene que enterarse aquí y no tres pantallas después.
 *
 * No comprueba jugabilidad — eso es `tools/validate.ts`, que corre en autoría.
 */

import { type Level, type Pos, TERRENOS_VALIDOS } from '../engine/index.js'

export class LevelSchemaError extends Error {
  constructor(
    readonly levelId: string,
    readonly problems: readonly string[],
  ) {
    super(`nivel "${levelId}": ${problems.join(' · ')}`)
    this.name = 'LevelSchemaError'
  }
}

export function parseLevel(raw: unknown): Level {
  const problems: string[] = []
  const o = raw as Record<string, unknown>
  const id = typeof o?.['id'] === 'string' ? (o['id'] as string) : '(sin id)'

  const req = (k: string, ok: boolean, msg: string): void => {
    if (!ok) problems.push(`${k}: ${msg}`)
  }

  req('id', typeof o?.['id'] === 'string', 'debe ser string')
  req('case', typeof o?.['case'] === 'number', 'debe ser number')
  req('title', typeof o?.['title'] === 'string', 'debe ser string')

  const grid = o?.['grid']
  const isGrid = Array.isArray(grid) && grid.every((l) => typeof l === 'string')
  req('grid', isGrid, 'debe ser string[]')
  if (isGrid) {
    const width = (grid as string[])[0]?.length ?? 0
    for (const [i, line] of (grid as string[]).entries()) {
      if (line.length !== width) problems.push(`grid[${i}]: ancho ${line.length} ≠ ${width}`)
      for (const ch of line) {
        if (!TERRENOS_VALIDOS.has(ch)) problems.push(`grid[${i}]: carácter "${ch}" desconocido`)
      }
    }
  }

  req('playerStart', isPos(o?.['playerStart']), 'debe ser [fila, columna]')
  req('shadowStart', isPos(o?.['shadowStart']), 'debe ser [fila, columna]')
  req('doors', o?.['doors'] === undefined || Array.isArray(o['doors']), 'debe ser array')
  req('plates', o?.['plates'] === undefined || Array.isArray(o['plates']), 'debe ser array')

  if (problems.length > 0) throw new LevelSchemaError(id, problems)

  return {
    ...(o as unknown as Level),
    doors: (o['doors'] as Level['doors']) ?? [],
    plates: (o['plates'] as Level['plates']) ?? [],
  }
}

function isPos(v: unknown): v is Pos {
  return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number')
}
