/**
 * @puzzle/authoring — solver, validaciones y generador.
 *
 * Corre en Node. **Nunca se empaqueta en la app.** Depende solo de @puzzle/kit
 * y @game/core: no sabe qué juego está validando.
 */
export { solve, replay, solveFrom, type SolveResult, type SolveOptions, type Node } from './solve.js'
export {
  validate, solvability, noTraps, blindFairness, relevanceOf,
  CORRIDOR_RATIO,
  type Check, type CheckContext, type LevelCheck, type ValidationReport,
} from './checks.js'
export {
  search, commonCriteria,
  type SearchSpec, type SearchResult, type SearchStats, type Candidate, type CommonCriteria,
} from './search.js'
export { makeRng, type Rng } from './rng.js'
export { currentRulesHash, isStale, type RulesHashSpec } from './rulesHash.js'
export { runBatch, type BatchOptions, type BatchLine } from './batch.js'
