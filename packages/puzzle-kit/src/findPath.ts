/**
 * BFS de RUNTIME — ruta óptima desde el estado actual.
 *
 * Existe para S-15: si el jugador se ha desviado de la solución guardada, la
 * escalera de pistas tiene que recalcular **desde donde está**, no desde el
 * principio. Sin esto, el quinto peldaño le daría una ruta que ya no puede
 * seguir.
 *
 * Es deliberadamente distinto del solver de autoría:
 *
 * | | `@puzzle/kit/findPath` | `@puzzle/authoring/solve` |
 * |---|---|---|
 * | Para qué | Runtime, dentro de la app | Autoría, en Node |
 * | Devuelve | Solo la ruta | Ruta + grafo completo + recuentos |
 * | Termina | En cuanto encuentra victoria, con cota de estados | Exhaustivo, sin cota |
 *
 * **No duplica reglas**: ambos llaman a `game.step()`. Lo que se duplica es el
 * recorrido, y hay una prueba que comprueba que los dos coinciden en longitud
 * sobre todos los niveles del catálogo.
 */

import type { DeterministicGame } from './deterministic.js'

export interface FindPathOptions {
  /** Cota de seguridad: en un móvil no se puede explorar sin límite. */
  readonly maxStates?: number
}

/**
 * Ruta óptima desde `state`, o `null` si no hay o si se agota la cota.
 * Un `null` por cota no significa «irresoluble»: significa «no lo sé».
 */
export function findPath<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  state: S,
  opts: FindPathOptions = {},
): readonly I[] | null {
  const maxStates = opts.maxStates ?? 50_000
  if (game.isVictory(level, state)) return []

  const seen = new Set<string>([game.hashState(state)])
  let frontier: { state: S; via: readonly I[] }[] = [{ state, via: [] }]

  while (frontier.length > 0) {
    const next: { state: S; via: readonly I[] }[] = []
    for (const node of frontier) {
      for (const input of game.inputs(level, node.state)) {
        const r = game.step(level, node.state, input)
        if (r.kind !== 'moved') continue
        const k = game.hashState(r.state)
        if (seen.has(k)) continue
        seen.add(k)
        const via = [...node.via, input]
        if (r.won) return via
        next.push({ state: r.state, via })
        if (seen.size > maxStates) return null
      }
    }
    frontier = next
  }
  return null
}
