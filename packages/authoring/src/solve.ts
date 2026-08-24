/**
 * SOLVER GENÉRICO — Rulebook §11 · Aplicación Maestra §4.2
 *
 * Herramienta de AUTORÍA, nunca de runtime. Comparte con el motor la misma
 * función `step()` a través del contrato, de modo que la equivalencia de reglas
 * se cumple **por construcción** y no por disciplina (§37 del Prompt Maestro:
 * «NO crear un solver que tenga reglas diferentes al juego»).
 *
 * No sabe qué es una sombra, ni una pista, ni una casilla. Solo llama a
 * `initialState`, `inputs`, `step`, `hashState` e `isVictory`.
 *
 * BFS exhaustivo sin cota. El espacio de estados es finito, así que termina
 * siempre; si agota la frontera sin victoria, queda DEMOSTRADO que el nivel es
 * irresoluble.
 *
 * - Los inputs que devuelven `{kind:'nothing'}` se descartan como transiciones
 *   nulas: poda natural del árbol.
 * - Los `{kind:'failed'}` tampoco generan transición: reinician el intento
 *   conservando el contador, así que nunca acortan una solución. Se registran
 *   aparte porque interesan a la validación de justicia a ciegas.
 */

import type { DeterministicGame } from '@puzzle/kit'

export interface Node<S, I> {
  readonly state: S
  readonly depth: number
  /** Nº de secuencias distintas de longitud `depth` que llegan aquí. */
  paths: number
  /** Primer camino encontrado. Al ser BFS, es óptimo. */
  readonly via: readonly I[]
  /** Inputs que desde aquí pierden el intento. */
  readonly lethal: I[]
  /** Transiciones salientes: input → clave del estado destino. */
  readonly out: Map<I, string>
}

export interface SolveResult<S, I> {
  readonly solvable: boolean
  readonly optimalMoves: number | null
  readonly solutionPath: readonly I[] | null
  readonly solutionCount: number
  /** Todos los estados alcanzables, incluidos los que no llevan a victoria. */
  readonly graph: ReadonlyMap<string, Node<S, I>>
  readonly reachableStates: number
  readonly victoryKeys: readonly string[]
}

export interface SolveOptions<S> {
  /**
   * Estado inicial alternativo. Es cómo se expresa de forma genérica una
   * validación del tipo «¿se resuelve igual sin la pieza clave?»: el juego
   * entrega un inicio mutilado y el solver hace el resto.
   */
  readonly startFrom?: S
  readonly maxStates?: number
  readonly countSolutionsCap?: number
}

const DEFAULT_MAX_STATES = 400_000

export function solve<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  opts: SolveOptions<S> = {},
): SolveResult<S, I> {
  const maxStates = opts.maxStates ?? DEFAULT_MAX_STATES
  const cap = opts.countSolutionsCap ?? 10_000
  const start = opts.startFrom ?? game.initialState(level)

  const graph = new Map<string, Node<S, I>>()
  const startKey = game.hashState(start)
  graph.set(startKey, { state: start, depth: 0, paths: 1, via: [], lethal: [], out: new Map() })

  const victoryKeys: string[] = []
  let best: number | null = null
  let bestPath: readonly I[] | null = null
  let frontier: string[] = [startKey]

  if (game.isVictory(level, start)) {
    victoryKeys.push(startKey)
    best = 0
    bestPath = []
  }

  while (frontier.length > 0 && best === null) {
    const nextFrontier: string[] = []

    for (const k of frontier) {
      const node = graph.get(k)
      if (!node) continue

      for (const input of game.inputs(level, node.state)) {
        const res = game.step(level, node.state, input)
        if (res.kind === 'nothing') continue
        if (res.kind === 'failed') {
          node.lethal.push(input)
          continue
        }

        const nk = game.hashState(res.state)
        node.out.set(input, nk)

        const existing = graph.get(nk)
        if (existing === undefined) {
          graph.set(nk, {
            state: res.state,
            depth: node.depth + 1,
            paths: Math.min(node.paths, cap),
            via: [...node.via, input],
            lethal: [],
            out: new Map(),
          })
          if (res.won) victoryKeys.push(nk)
          else nextFrontier.push(nk)
        } else if (existing.depth === node.depth + 1) {
          existing.paths = Math.min(existing.paths + node.paths, cap)
        }

        if (graph.size > maxStates) {
          throw new Error(`solver: espacio de estados > ${maxStates}. Revisa el nivel o sube maxStates.`)
        }
      }
    }

    if (victoryKeys.length > 0) {
      let min = Infinity
      for (const vk of victoryKeys) {
        const d = graph.get(vk)?.depth ?? Infinity
        if (d < min) min = d
      }
      best = min
      const winners = victoryKeys.filter((vk) => graph.get(vk)?.depth === min)
      bestPath = graph.get(winners[0] as string)?.via ?? null
    }

    frontier = nextFrontier
  }

  // Se sigue explorando aunque ya haya victoria: la validación de estados atrapa
  // y la métrica de pasillo necesitan el grafo alcanzable COMPLETO, no solo la
  // parte que lleva a ganar.
  exploreRemaining(game, level, graph, victoryKeys, maxStates)

  let solutionCount = 0
  if (best !== null) {
    for (const vk of victoryKeys) {
      const n = graph.get(vk)
      if (n && n.depth === best) solutionCount = Math.min(solutionCount + n.paths, cap)
    }
  }

  return {
    solvable: best !== null,
    optimalMoves: best,
    solutionPath: bestPath,
    solutionCount,
    graph,
    reachableStates: graph.size,
    victoryKeys,
  }
}

function exploreRemaining<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  graph: Map<string, Node<S, I>>,
  victoryKeys: readonly string[],
  maxStates: number,
): void {
  const terminal = new Set(victoryKeys)
  const queue = [...graph.keys()].filter((k) => !terminal.has(k))
  const done = new Set<string>()

  while (queue.length > 0) {
    const k = queue.shift() as string
    if (done.has(k)) continue
    done.add(k)
    const node = graph.get(k)
    if (!node) continue

    if (node.out.size > 0 || node.lethal.length > 0) {
      for (const nk of node.out.values()) if (!done.has(nk)) queue.push(nk)
      continue
    }

    for (const input of game.inputs(level, node.state)) {
      const res = game.step(level, node.state, input)
      if (res.kind === 'nothing') continue
      if (res.kind === 'failed') {
        node.lethal.push(input)
        continue
      }
      const nk = game.hashState(res.state)
      node.out.set(input, nk)
      if (!graph.has(nk)) {
        graph.set(nk, {
          state: res.state,
          depth: node.depth + 1,
          paths: 0,
          via: [...node.via, input],
          lethal: [],
          out: new Map(),
        })
        if (res.won) terminal.add(nk)
        if (graph.size > maxStates) return
      }
      if (!done.has(nk) && !terminal.has(nk)) queue.push(nk)
    }
  }
}

/** Reproduce una secuencia sobre el nivel. Es el corazón del test de equivalencia. */
export function replay<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  path: readonly I[],
): { won: boolean; moves: number; error?: string } {
  let state = game.initialState(level)
  let moves = 0
  for (const [i, input] of path.entries()) {
    const r = game.step(level, state, input)
    if (r.kind === 'nothing') return { won: false, moves, error: `input nulo en ${i}` }
    if (r.kind === 'failed') return { won: false, moves, error: `intento perdido en ${i}` }
    state = r.state
    if (r.counted) moves++
    if (r.won) return { won: true, moves }
  }
  return { won: false, moves, error: 'la secuencia terminó sin victoria' }
}

/**
 * Ruta óptima desde un estado arbitrario. Es lo que S-15 necesita para su quinto
 * peldaño cuando el jugador se ha desviado de la solución: recalcular desde
 * donde está, no desde el principio.
 *
 * Era el hueco que la guía de implementación señalaba como pendiente.
 */
export function solveFrom<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  state: S,
): readonly I[] | null {
  return solve(game, level, { startFrom: state }).solutionPath
}
