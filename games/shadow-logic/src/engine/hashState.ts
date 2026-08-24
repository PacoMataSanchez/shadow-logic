/**
 * Clave de estado — fuente única.
 *
 * La usan el BFS del solver y los tests de determinismo. `moves` NO entra:
 * en el BFS lo representa la profundidad.
 */

import { lightsKey } from './light.js'
import { type Estado, type PosKey, key } from './types.js'

function sortedJoin(s: ReadonlySet<PosKey>): string {
  return [...s].sort().join('|')
}

export function hashState(estado: Estado): string {
  const sha =
    estado.sha === null ? 'X' : `${key(estado.sha)}${estado.shaAbsent ? 'a' : ''}`
  return [
    key(estado.det),
    sha,
    sortedJoin(estado.got),
    sortedJoin(estado.filled),
    lightsKey(estado.lights),
  ].join('/')
}
