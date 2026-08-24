/**
 * REVALIDAR TODO AL CAMBIAR REGLAS.
 *
 * El guardián del proyecto. Sobre cada nivel:
 *
 *   1. lo revalida con el motor actual,
 *   2. repite su `solutionPath` esperando victoria en exactamente `optimalMoves`
 *      — el test de equivalencia motor–solver, el más importante de todos —,
 *   3. comprueba que los campos calculados siguen siendo ciertos,
 *   4. avisa si el `rulesHash` ya no coincide con el motor.
 *
 * Genérico: no sabe qué juego revalida.
 */

import type { DeterministicGame } from '@puzzle/kit'
import type { LevelCheck } from './checks.js'
import { validate } from './checks.js'
import { replay } from './solve.js'
import { currentRulesHash, type RulesHashSpec } from './rulesHash.js'

export interface BatchOptions<L, S, I, FX> {
  readonly game: DeterministicGame<L, S, I, FX>
  readonly levels: readonly L[]
  readonly checks: readonly LevelCheck<L, S, I, FX>[]
  readonly rules: RulesHashSpec
  /** Cómo leer del nivel lo que escribió el generador. */
  readonly calculated: (level: L) => {
    optimalMoves?: number
    solutionPath?: readonly I[]
    solutionCount?: number
    rulesHash?: string
  }
}

export interface BatchLine {
  readonly id: string
  readonly ok: boolean
  readonly optimalMoves: number | null
  readonly stateRatio: number | null
  readonly corridor: boolean
  readonly problems: readonly string[]
}

export interface BatchReport {
  readonly rulesHash: string
  readonly lines: readonly BatchLine[]
  readonly ok: boolean
  readonly stale: number
}

export function runBatch<L, S, I, FX>(opts: BatchOptions<L, S, I, FX>): BatchReport {
  const rulesHash = currentRulesHash(opts.rules)
  const lines: BatchLine[] = []
  let stale = 0

  for (const level of opts.levels) {
    const meta = opts.game.levelMeta(level)
    const calc = opts.calculated(level)
    const report = validate(opts.game, level, opts.checks)
    const problems: string[] = []

    for (const c of report.checks) if (!c.ok) problems.push(`V${c.n} ${c.name}: ${c.detail}`)

    if (report.optimalMoves !== calc.optimalMoves) {
      problems.push(`optimalMoves ${calc.optimalMoves} ≠ ${report.optimalMoves} recalculado`)
    }
    if (report.solutionCount !== calc.solutionCount) {
      problems.push(`solutionCount ${calc.solutionCount} ≠ ${report.solutionCount} recalculado`)
    }

    const eq = replay(opts.game, level, calc.solutionPath ?? [])
    if (!eq.won || eq.moves !== calc.optimalMoves) {
      problems.push(
        `equivalencia motor–solver: ${eq.error ?? `ganó en ${eq.moves}, esperaba ${calc.optimalMoves}`}`,
      )
    }

    if (calc.rulesHash !== rulesHash) {
      stale++
      problems.push('rulesHash desfasado: pendiente de revalidar')
    }

    lines.push({
      id: meta.id,
      ok: problems.length === 0,
      optimalMoves: report.optimalMoves,
      stateRatio: report.stateRatio,
      corridor: report.corridorWarning,
      problems,
    })
  }

  return { rulesHash, lines, ok: lines.every((l) => l.ok), stale }
}
