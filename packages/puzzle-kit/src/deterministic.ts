/**
 * LA EXTENSIÓN DETERMINISTA — Aplicación Maestra v0.3 §4.2
 *
 * Solo la implementan los juegos que declaran `deterministic: true`.
 * A cambio se llevan gratis: deshacer ilimitado, previsualización, repetición,
 * pruebas de contrato, y —si además declaran `solvable`— solver, validaciones,
 * generador y escalera de pistas.
 *
 * Está verificado contra el motor real de Shadow Logic: un BFS escrito solo
 * contra esta interfaz reproduce los ocho `optimalMoves` del Caso 01.
 */

import type { LevelGame } from '@game/core'

export type TurnResult<S, FX> =
  /** Algo pasó. `counted` lo decide el juego, no la carcasa. */
  | { kind: 'moved'; state: S; counted: boolean; won: boolean; fx?: FX }
  /** El intento se pierde y el nivel se reinicia. S-09 en Shadow Logic. */
  | { kind: 'failed'; fx?: FX }
  /** Input nulo: no cuenta, no pasó nada. S-01 en Shadow Logic. */
  | { kind: 'nothing' }

export interface DeterministicGame<L, S, I, FX = unknown> extends LevelGame<L> {
  initialState(level: L): S
  /** Ramificación. El BFS la recorre entera; los inputs nulos se podan solos. */
  inputs(level: L, state: S): readonly I[]
  step(level: L, state: S, input: I): TurnResult<S, FX>
  /** Clave de estado. Fuente única: la usan el solver, el deshacer y las pruebas. */
  hashState(state: S): string
  isVictory(level: L, state: S): boolean
}
