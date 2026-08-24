/**
 * @puzzle/kit — extensión para juegos deterministas por turnos.
 *
 * La carcasa lo usa SOLO si el juego declara `capabilities.deterministic`.
 * Un arcade que no lo declare usa la carcasa entera igualmente; simplemente no
 * tiene deshacer, previsualización ni pistas por solución.
 */
export * from './deterministic.js'
export { Session, type Attempt } from './history.js'
export { findPath, type FindPathOptions } from './findPath.js'
export { previewInput, type Preview } from './preview.js'
export { resolveHint, isFreeRung, type Hint, type HintRequest } from './hintLadder.js'
export { describeContract } from './testkit.js'
