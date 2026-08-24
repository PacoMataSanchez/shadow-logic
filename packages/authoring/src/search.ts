/**
 * GENERACIÓN POR BÚSQUEDA — A-07.
 *
 * El coste bajo del solver permite proponer tableros y descartar los que no
 * superan las validaciones. Este fichero es **el bucle**, que es genérico:
 * proponer → resolver → validar → medir criterios → aceptar.
 *
 * Lo que el juego aporta es `propose()`. En Shadow Logic eso significa colocar
 * pistas, salida, placas y agujeros dentro de un molde dibujado a mano; en otro
 * juego significará otra cosa. El bucle no lo sabe ni lo necesita.
 *
 * El diagnóstico —qué validación y qué criterio fallan, y cuántas veces— es la
 * parte que más tiempo ahorra: sin él, una receta que no produce nada parece
 * mala suerte en vez de un molde mal dibujado.
 */

import type { DeterministicGame } from '@puzzle/kit'
import type { LevelCheck, ValidationReport } from './checks.js'
import { CORRIDOR_RATIO, validate } from './checks.js'
import { makeRng, type Rng } from './rng.js'
import { solve } from './solve.js'

export interface SearchSpec<L, S, I, FX> {
  propose(rng: Rng): L
  readonly checks: readonly LevelCheck<L, S, I, FX>[]
  /** Devuelve la lista de criterios INCUMPLIDOS. Vacía = aceptado. */
  criteria?(level: L, report: ValidationReport<I>): string[]
  readonly maxStates?: number
}

export interface Candidate<L, I> {
  readonly level: L
  readonly report: ValidationReport<I>
}

export interface SearchStats {
  tried: number
  unsolvable: number
  validationFail: number
  criteriaFail: number
  accepted: number
  readonly byCheck: Record<string, number>
  readonly byCriterion: Record<string, number>
}

export interface SearchResult<L, I> {
  readonly best: Candidate<L, I> | null
  readonly accepted: readonly Candidate<L, I>[]
  readonly stats: SearchStats
}

export function search<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  spec: SearchSpec<L, S, I, FX>,
  seed: number,
  tries: number,
): SearchResult<L, I> {
  const rng = makeRng(seed)
  const stats: SearchStats = {
    tried: 0,
    unsolvable: 0,
    validationFail: 0,
    criteriaFail: 0,
    accepted: 0,
    byCheck: {},
    byCriterion: {},
  }
  const bump = (bag: Record<string, number>, k: string): void => {
    bag[k] = (bag[k] ?? 0) + 1
  }
  const accepted: Candidate<L, I>[] = []

  for (let t = 0; t < tries; t++) {
    stats.tried++
    const level = spec.propose(rng)

    const solved = solve(game, level, { maxStates: spec.maxStates ?? 60_000 })
    if (!solved.solvable) {
      stats.unsolvable++
      continue
    }

    const report = validate(game, level, spec.checks, solved)
    if (!report.ok) {
      stats.validationFail++
      for (const c of report.checks) if (!c.ok) bump(stats.byCheck, `${c.n}·${c.name}`)
      continue
    }

    const missed = spec.criteria?.(level, report) ?? []
    if (missed.length > 0) {
      stats.criteriaFail++
      for (const m of missed) bump(stats.byCriterion, m)
      continue
    }

    stats.accepted++
    accepted.push({ level, report })
  }

  // El mejor candidato: el más largo. A igualdad, el que más espacio de decisión
  // ofrece — porque una solución larga con pocos estados es un pasillo.
  const best =
    [...accepted].sort((a, b) => {
      const m = (b.report.optimalMoves ?? 0) - (a.report.optimalMoves ?? 0)
      return m !== 0 ? m : b.report.reachableStates - a.report.reachableStates
    })[0] ?? null

  return { best, accepted, stats }
}

// ── criterios genéricos reutilizables ───────────────────────────────────────

export interface CommonCriteria {
  readonly minMoves?: number
  readonly maxMoves?: number
  /** `solutionCount === 1`. Sello de calidad; activo por defecto. */
  readonly uniqueSolution?: boolean
  readonly minStateRatio?: number
}

export function commonCriteria<I>(c: CommonCriteria, report: ValidationReport<I>): string[] {
  const out: string[] = []
  const moves = report.optimalMoves ?? 0
  if (c.minMoves !== undefined && moves < c.minMoves) out.push('demasiado corto')
  if (c.maxMoves !== undefined && moves > c.maxMoves) out.push('demasiado largo')
  if ((c.uniqueSolution ?? true) && report.solutionCount !== 1) out.push('solución no única')
  const minRatio = c.minStateRatio ?? CORRIDOR_RATIO
  if (report.stateRatio !== null && report.stateRatio < minRatio) out.push('pasillo (ratio bajo)')
  return out
}
