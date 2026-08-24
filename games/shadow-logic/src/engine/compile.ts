/**
 * Precompilación del nivel a estructuras de consulta O(1).
 *
 * Es una optimización interna, NO una regla: no decide nada, solo indexa lo que
 * ya está en el JSON. El BFS del solver llama a `step()` cientos de miles de
 * veces y no puede permitirse recorrer arrays en cada consulta.
 *
 * Se memoiza por identidad del objeto `Level` (WeakMap), así que `step()` sigue
 * siendo puro y observacionalmente idéntico.
 */

import {
  type DoorDef,
  type Level,
  type PlateDef,
  type Pos,
  type PosKey,
  type Terreno,
  TERRENO,
  key,
} from './types.js'

export interface CompiledLevel {
  readonly level: Level
  readonly rows: number
  readonly cols: number
  readonly terrain: readonly (readonly Terreno[])[]
  readonly clues: ReadonlySet<PosKey>
  readonly clueCount: number
  readonly exit: Pos | null
  readonly doorAt: ReadonlyMap<PosKey, DoorDef>
  readonly plateAt: ReadonlyMap<PosKey, PlateDef>
  readonly plateById: ReadonlyMap<string, PlateDef>
  readonly darkGroupAt: ReadonlyMap<PosKey, number>
  readonly switchGroupAt: ReadonlyMap<PosKey, number>
  readonly initialLights: ReadonlySet<number>
}

const cache = new WeakMap<Level, CompiledLevel>()

export function compile(level: Level): CompiledLevel {
  const hit = cache.get(level)
  if (hit) return hit
  const built = build(level)
  cache.set(level, built)
  return built
}

function build(level: Level): CompiledLevel {
  const rows = level.grid.length
  const cols = rows === 0 ? 0 : (level.grid[0]?.length ?? 0)

  const terrain: Terreno[][] = []
  const clues = new Set<PosKey>()
  let exit: Pos | null = null

  for (let r = 0; r < rows; r++) {
    const line = level.grid[r] ?? ''
    const row: Terreno[] = []
    for (let c = 0; c < cols; c++) {
      const ch = (line[c] ?? TERRENO.PARED) as Terreno
      row.push(ch)
      if (ch === TERRENO.PISTA) clues.add(key([r, c]))
      if (ch === TERRENO.SALIDA) exit = [r, c]
    }
    terrain.push(row)
  }

  const doorAt = new Map<PosKey, DoorDef>()
  for (const d of level.doors ?? []) doorAt.set(key(d.pos), d)

  const plateAt = new Map<PosKey, PlateDef>()
  const plateById = new Map<string, PlateDef>()
  for (const p of level.plates ?? []) {
    plateAt.set(key(p.pos), p)
    plateById.set(p.id, p)
  }

  const darkGroupAt = new Map<PosKey, number>(Object.entries(level.darkGroups ?? {}))
  const switchGroupAt = new Map<PosKey, number>(Object.entries(level.switchGroups ?? {}))

  return {
    level,
    rows,
    cols,
    terrain,
    clues,
    clueCount: clues.size,
    exit,
    doorAt,
    plateAt,
    plateById,
    darkGroupAt,
    switchGroupAt,
    initialLights: new Set(level.lightsOn ?? []),
  }
}

export function inBounds(cl: CompiledLevel, p: Pos): boolean {
  return p[0] >= 0 && p[0] < cl.rows && p[1] >= 0 && p[1] < cl.cols
}

export function terrainAt(cl: CompiledLevel, p: Pos): Terreno {
  if (!inBounds(cl, p)) return TERRENO.PARED
  return cl.terrain[p[0]]?.[p[1]] ?? TERRENO.PARED
}
