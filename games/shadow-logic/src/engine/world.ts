/**
 * Placas y puertas — S-06.
 *
 * Las puertas NO viven en el estado: se derivan de la posición de la sombra.
 * Eso es lo que mantiene la clave de estado mínima y elimina toda ambigüedad
 * sobre puertas que cambian a mitad de un deslizamiento.
 */

import { type CompiledLevel } from './compile.js'
import { type Estado, type PosKey, key } from './types.js'

/**
 * S-06 — solo la sombra pesa. El detective es demasiado ligero y además nunca
 * está quieto. Una sombra ausente por falta de luz (S-19) tampoco pesa, y una
 * sombra fuera de juego (S-05) menos todavía.
 */
export function plateActive(estado: Estado, plateKey: PosKey): boolean {
  if (estado.sha === null || estado.shaAbsent) return false
  return key(estado.sha) === plateKey
}

/**
 * Paso 2 del orden canónico: congelar el estado de las puertas al inicio del
 * turno. El conjunto devuelto se usa sin recalcular durante todo el turno.
 *
 * NO es un detalle de implementación: es la regla que hace el turno
 * determinista sin sub-pasos (Rulebook §3).
 */
export function freezeDoors(cl: CompiledLevel, estado: Estado): ReadonlySet<PosKey> {
  const open = new Set<PosKey>()
  for (const [k, door] of cl.doorAt) {
    if (doorIsOpen(cl, estado, door.controlledBy, door.logic)) open.add(k)
  }
  return open
}

function doorIsOpen(
  cl: CompiledLevel,
  estado: Estado,
  controlledBy: readonly string[],
  logic: 'AND' | 'OR',
): boolean {
  if (controlledBy.length === 0) return false // puerta sin placa = cerrada permanentemente
  let anyOn = false
  let allOn = true
  for (const plateId of controlledBy) {
    const plate = cl.plateById.get(plateId)
    const on = plate !== undefined && plateActive(estado, key(plate.pos))
    if (on) anyOn = true
    else allOn = false
  }
  return logic === 'AND' ? allOn : anyOn
}
