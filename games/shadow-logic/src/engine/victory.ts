/**
 * Victoria — S-07, S-12.
 *
 * El nivel se supera cuando el detective ha recogido TODAS las pistas y un
 * deslizamiento termina sobre la casilla de salida.
 *
 * La salida NO frena nunca: es suelo a todos los efectos. La parada debe
 * producirse por una colisión legítima —pared, borde, puerta cerrada o la
 * propia sombra— que ocurra justo en esa casilla.
 *
 * S-12: en el Mundo 1 las pistas se recogen en cualquier orden.
 */

import { type CompiledLevel } from './compile.js'
import { type Estado, samePos } from './types.js'

export function allCluesCollected(cl: CompiledLevel, estado: Estado): boolean {
  if (estado.got.size < cl.clueCount) return false
  for (const k of cl.clues) if (!estado.got.has(k)) return false
  return true
}

export function isVictory(cl: CompiledLevel, estado: Estado): boolean {
  if (cl.exit === null) return false
  if (!samePos(estado.det, cl.exit)) return false
  return allCluesCollected(cl, estado)
}
