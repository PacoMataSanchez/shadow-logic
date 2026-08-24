/**
 * @game/shadow-logic — el juego.
 *
 * Depende de @game/core y @puzzle/kit. **No puede importar de la carcasa**:
 * si alguna vez lo necesitara, sería que el contrato tiene un agujero.
 */
export { shadowLogic, type SLFx, type ShadowLogicGame } from './adapter.js'
export { LEVELS, CASES, levelById, nextLevel } from './levels/loader.js'
export { parseLevel, LevelSchemaError } from './levels/schema.js'
export * as engine from './engine/index.js'
