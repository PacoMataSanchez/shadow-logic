/**
 * La luz — S-17, S-18, S-19. Caso 02 en adelante.
 *
 * Primer elemento que trata de forma distinta al detective y a la sombra.
 */

import { type CompiledLevel } from './compile.js'
import { type Estado, type Pos, type PosKey, key, samePos } from './types.js'

/**
 * S-17 — una casilla es oscura si pertenece a un grupo de luz apagado.
 * Suelo normal para el detective; muro para la sombra.
 *
 * `lights` se pasa explícitamente porque durante un turno se usa el conjunto
 * CONGELADO (paso 2), no el que resultará al final del turno.
 */
export function isDark(
  cl: CompiledLevel,
  p: Pos,
  lights: ReadonlySet<number>,
): boolean {
  const g = cl.darkGroupAt.get(key(p))
  if (g === undefined) return false
  return !lights.has(g)
}

/** S-18 — el detective acciona el interruptor al pasar por encima. No lo detiene. */
export function switchGroupAt(cl: CompiledLevel, p: Pos): number | undefined {
  return cl.switchGroupAt.get(key(p))
}

/**
 * S-18 — aplica los interruptores pisados durante el deslizamiento.
 * Se hace en el paso 5 (reevaluar el mundo), nunca a mitad de recorrido:
 * si no, el interruptor cambiaría el mundo bajo los pies del propio deslizamiento.
 *
 * Conmutación: pisar dos veces el mismo grupo en un turno lo deja como estaba.
 */
export function applySwitches(
  lights: ReadonlySet<number>,
  hits: readonly number[],
): ReadonlySet<number> {
  if (hits.length === 0) return lights
  const next = new Set(lights)
  for (const g of hits) {
    if (next.has(g)) next.delete(g)
    else next.add(g)
  }
  return next
}

export interface ShadowPresence {
  readonly sha: Pos | null
  readonly shaAbsent: boolean
}

/**
 * S-19 — resuelve presencia/ausencia de la sombra con las luces YA aplicadas.
 *
 * - Si la luz se apaga sobre su casilla, la sombra desaparece.
 * - Vuelve a aparecer en esa misma casilla en cuanto la luz regrese...
 * - ...y, si el detective la ocupa, sigue ausente hasta el primer turno en que quede libre.
 *
 * La ausencia NO es la pérdida de S-05: la sombra ausente vuelve, la caída no.
 */
export function resolveShadowPresence(
  cl: CompiledLevel,
  sha: Pos | null,
  shaAbsent: boolean,
  det: Pos,
  lights: ReadonlySet<number>,
): ShadowPresence {
  if (sha === null) return { sha: null, shaAbsent: false } // fuera de juego, nunca reaparece
  const dark = isDark(cl, sha, lights)
  if (dark) return { sha, shaAbsent: true }
  if (shaAbsent && samePos(sha, det)) return { sha, shaAbsent: true } // casilla ocupada: espera
  return { sha, shaAbsent: false }
}

/** ¿La sombra bloquea físicamente esta casilla ahora mismo? */
export function shadowBlocks(
  sha: Pos | null,
  shaAbsent: boolean,
  p: Pos,
): boolean {
  if (sha === null || shaAbsent) return false
  return samePos(sha, p)
}

export function lightsKey(lights: ReadonlySet<number>): string {
  return [...lights].sort((a, b) => a - b).join('.')
}

export type { PosKey }
