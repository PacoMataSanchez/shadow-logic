/**
 * Tabla de colisiones — Rulebook §4.
 *
 * Traducción literal de las dos tablas del Rulebook. Si el Rulebook cambia una
 * fila, cambia aquí y en ningún otro sitio.
 */

import { type CompiledLevel, terrainAt, inBounds } from './compile.js'
import { isDark, shadowBlocks } from './light.js'
import { type Pos, type PosKey, TERRENO, key } from './types.js'

/** Mundo congelado en el paso 2 del turno. Inmutable durante todo el turno. */
export interface FrozenWorld {
  readonly cl: CompiledLevel
  readonly doorsOpen: ReadonlySet<PosKey>
  readonly lights: ReadonlySet<number>
  readonly filled: ReadonlySet<PosKey>
  readonly sha: Pos | null
  readonly shaAbsent: boolean
}

export type DetOutcome = 'stop' | 'enter' | 'fall' | 'push'

/** El detective se desliza y encuentra… */
export function detectiveOutcome(w: FrozenWorld, next: Pos): DetOutcome {
  if (!inBounds(w.cl, next)) return 'stop' // borde del tablero
  const t = terrainAt(w.cl, next)
  const k = key(next)

  if (t === TERRENO.PARED) return 'stop'
  if (t === TERRENO.PUERTA && !w.doorsOpen.has(k)) return 'stop'

  // La sombra ausente por falta de luz no bloquea (S-19).
  if (shadowBlocks(w.sha, w.shaAbsent, next)) return 'push' // S-03

  if (t === TERRENO.AGUJERO && !w.filled.has(k)) return 'fall' // S-09

  // Suelo, pista, placa, puerta abierta, agujero tapado,
  // zona oscura (S-17: suelo para él), interruptor (S-18), salida (S-07): continúa.
  return 'enter'
}

export type ShaOutcome = 'stop' | 'enter' | 'sink'

/** La sombra empujada encuentra… */
export function shadowOutcome(w: FrozenWorld, next: Pos): ShaOutcome {
  if (!inBounds(w.cl, next)) return 'stop'
  const t = terrainAt(w.cl, next)
  const k = key(next)

  if (t === TERRENO.PARED) return 'stop'
  if (t === TERRENO.PUERTA && !w.doorsOpen.has(k)) return 'stop'
  if (isDark(w.cl, next, w.lights)) return 'stop' // S-17: muro para ella

  if (t === TERRENO.AGUJERO && !w.filled.has(k)) return 'sink' // S-05

  // Suelo, pista (no la recoge, S-08), placa, salida, puerta abierta,
  // agujero tapado, interruptor (no lo acciona, S-18): continúa.
  return 'enter'
}
