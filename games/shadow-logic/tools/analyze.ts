/**
 * Análisis de una solución: qué mecánicas usa realmente.
 *
 * Alimenta los criterios de generación de la Arquitectura §5:
 * `needPush`, `needBridge`, `needSwitch`, `needVanish`.
 *
 * `needVanish` es obligatorio para los niveles que enseñan S-19: medido, en
 * cuatro tandas de generación libre no apareció ni una sola vez. El azar no lo
 * encuentra; hay que exigirlo.
 */

import { type Direccion, type Level, initialState, step } from '../src/engine/index.js'

export interface PathAnalysis {
  readonly push: boolean
  readonly bridge: boolean
  readonly switchUsed: boolean
  readonly vanish: boolean
  readonly shadowMoves: number
}

export function analyzePath(level: Level, path: readonly Direccion[]): PathAnalysis {
  let estado = initialState(level)
  let push = false
  let bridge = false
  let switchUsed = false
  let vanish = estado.shaAbsent
  let shadowMoves = 0

  for (const dir of path) {
    const res = step(level, estado, dir)
    if (res.kind !== 'moved') break
    if (res.shadowPath && res.shadowPath.length > 1) {
      push = true
      shadowMoves++
    } else if (res.shadowPath) {
      push = true // empujón que no desplaza: S-04 sigue siendo uso de la sombra
    }
    if (res.sunk) bridge = true
    if (res.estado.lights !== estado.lights) switchUsed = true
    if (res.estado.shaAbsent) vanish = true
    estado = res.estado
  }

  return { push, bridge, switchUsed, vanish, shadowMoves }
}
