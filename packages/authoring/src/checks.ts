/**
 * VALIDACIONES — Rulebook §11.
 *
 * Aquí viven **solo las que no necesitan conocer el juego**: se calculan
 * leyendo el grafo de estados que devuelve el solver. Las que hablan de sombras,
 * pistas o salidas las aporta el propio juego a través de `GameAuthoring.checks`.
 *
 * El reparto no es estético: es la prueba de que la frontera está bien puesta.
 * Si una validación genérica necesitara mirar el terreno, estaría mal colocada.
 */

import type { DeterministicGame } from '@puzzle/kit'
import type { SolveResult } from './solve.js'
import { solve } from './solve.js'

export interface Check {
  readonly n: number
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export interface CheckContext<L, S, I, FX> {
  readonly game: DeterministicGame<L, S, I, FX>
  readonly level: L
  readonly result: SolveResult<S, I>
}

export type LevelCheck<L, S, I, FX> = (ctx: CheckContext<L, S, I, FX>) => Check

/** Rulebook §11-BIS: por debajo de este cociente el nivel es un pasillo, no un puzzle. */
export const CORRIDOR_RATIO = 4

export interface ValidationReport<I> {
  readonly levelId: string
  readonly ok: boolean
  readonly checks: readonly Check[]
  readonly optimalMoves: number | null
  readonly solutionPath: readonly I[] | null
  readonly solutionCount: number
  readonly reachableStates: number
  readonly stateRatio: number | null
  readonly corridorWarning: boolean
}

export function validate<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  gameChecks: readonly LevelCheck<L, S, I, FX>[] = [],
  precomputed?: SolveResult<S, I>,
): ValidationReport<I> {
  const result = precomputed ?? solve(game, level)
  const ctx: CheckContext<L, S, I, FX> = { game, level, result }

  const checks: Check[] = [
    solvability(ctx),
    noTraps(ctx),
    blindFairness(ctx),
    ...gameChecks.map((c) => c(ctx)),
  ]

  const stateRatio = result.optimalMoves ? result.reachableStates / result.optimalMoves : null

  return {
    levelId: game.levelMeta(level).id,
    ok: checks.every((c) => c.ok),
    checks: [...checks].sort((a, b) => a.n - b.n),
    optimalMoves: result.optimalMoves,
    solutionPath: result.solutionPath,
    solutionCount: result.solutionCount,
    reachableStates: result.reachableStates,
    stateRatio,
    corridorWarning: stateRatio !== null && stateRatio < CORRIDOR_RATIO,
  }
}

// ────────────────────────────────────────────────────────────────────────────

/** Validación 1 — resolubilidad. */
export function solvability<L, S, I, FX>(ctx: CheckContext<L, S, I, FX>): Check {
  const r = ctx.result
  return {
    n: 1,
    name: 'Resolubilidad',
    ok: r.solvable,
    detail: r.solvable
      ? `óptimo ${r.optimalMoves} movimientos, ${r.solutionCount} solución(es) óptima(s)`
      : 'el BFS agotó la frontera sin victoria: DEMOSTRADO irresoluble',
  }
}

/**
 * Validación 3 — sin estados atrapa.
 *
 * Gana importancia con cualquier mecánica irreversible: llevar la pieza clave al
 * sitio equivocado puede dejar el nivel sin solución sin que el jugador lo
 * perciba. En Shadow Logic es la que más candidatos rechaza.
 */
export function noTraps<L, S, I, FX>(ctx: CheckContext<L, S, I, FX>): Check {
  const r = ctx.result
  if (!r.solvable) return { n: 3, name: 'Sin estados atrapa', ok: false, detail: 'no evaluada' }

  const canWin = new Set<string>(r.victoryKeys)
  let changed = true
  while (changed) {
    changed = false
    for (const [k, node] of r.graph) {
      if (canWin.has(k)) continue
      for (const nk of node.out.values()) {
        if (canWin.has(nk)) {
          canWin.add(k)
          changed = true
          break
        }
      }
    }
  }

  const traps = [...r.graph.keys()].filter((k) => !canWin.has(k))
  return {
    n: 3,
    name: 'Sin estados atrapa',
    ok: traps.length === 0,
    detail:
      traps.length === 0
        ? `${r.graph.size} estados alcanzables, todos con victoria alcanzable`
        : `${traps.length} estado(s) sin salida — p.ej. ${traps[0]}`,
  }
}

/**
 * Validación 5 — justicia sin ayudas de previsualización (S-14 modo `none`).
 *
 * La previsualización es un ajuste del jugador, así que ningún nivel puede
 * apoyarse en ella. Criterio operativo, deliberadamente conservador:
 *
 *   a) No existe muerte forzada: ningún estado alcanzable donde todos los inputs
 *      con efecto pierdan el intento.
 *   b) El estado inicial no pierde en más de dos direcciones.
 *
 * El umbral exacto sigue abierto en el Rulebook §14 y se cerrará con playtesting.
 */
export function blindFairness<L, S, I, FX>(ctx: CheckContext<L, S, I, FX>): Check {
  const r = ctx.result
  if (!r.solvable) return { n: 5, name: 'Justicia en modo ciego', ok: false, detail: 'no evaluada' }

  const forced = [...r.graph.entries()].filter(
    ([, node]) => node.lethal.length > 0 && node.out.size === 0,
  )
  const startLethal = [...r.graph.values()].find((n) => n.depth === 0)?.lethal.length ?? 0
  const ok = forced.length === 0 && startLethal <= 2

  return {
    n: 5,
    name: 'Justicia en modo ciego',
    ok,
    detail: ok
      ? `sin muerte forzada; ${startLethal} dirección(es) letal(es) desde la salida`
      : forced.length > 0
        ? `${forced.length} estado(s) donde todo input pierde`
        : `${startLethal} de ${r.graph.get([...r.graph.keys()][0] as string)?.out.size ?? 4} direcciones pierden en el primer gesto`,
  }
}

/**
 * Validación 2 genérica — «¿se resuelve igual sin la pieza clave?».
 *
 * El mecanismo es genérico; lo que es del juego es **qué pieza se quita**. El
 * juego entrega un estado inicial mutilado y esto hace el resto.
 */
export function relevanceOf<L, S, I, FX>(
  handicap: (game: DeterministicGame<L, S, I, FX>, level: L) => S,
  pieceName: string,
  exempt?: (level: L) => boolean,
): LevelCheck<L, S, I, FX> {
  return (ctx) => {
    if (exempt?.(ctx.level)) {
      return { n: 2, name: `Relevancia de ${pieceName}`, ok: true, detail: 'exenta: tutorial' }
    }
    if (!ctx.result.solvable) {
      return { n: 2, name: `Relevancia de ${pieceName}`, ok: false, detail: 'no evaluada' }
    }
    const without = solve(ctx.game, ctx.level, { startFrom: handicap(ctx.game, ctx.level) })
    const relevant = !without.solvable || without.optimalMoves !== ctx.result.optimalMoves
    return {
      n: 2,
      name: `Relevancia de ${pieceName}`,
      ok: relevant,
      detail: without.solvable
        ? `sin ${pieceName} se resuelve en ${without.optimalMoves} (con: ${ctx.result.optimalMoves})`
        : `sin ${pieceName} el nivel es irresoluble`,
    }
  }
}
