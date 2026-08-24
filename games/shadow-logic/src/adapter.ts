/**
 * SHADOW LOGIC ENCHUFADO AL CONTRATO.
 *
 * Todo el pegamento que hace falta entre el motor y la carcasa. **Ni una regla
 * se toca**: el motor no sabe que este fichero existe, igual que no sabe que
 * existe React.
 *
 * `fx` lleva los recorridos que el render necesita para animar. La carcasa nunca
 * lo mira — se lo pasa entero al renderizador del juego. Es lo que permite que
 * otro juego, con animaciones completamente distintas, use la misma carcasa.
 */

import type { DeterministicGame } from '@puzzle/kit'

import * as SL from './engine/index.js'
import { parseLevel } from './levels/schema.js'

export interface SLFx {
  /** Recorrido del detective, casilla a casilla, incluida la de partida. */
  readonly path: readonly SL.Pos[]
  /** Recorrido de la sombra empujada, si hubo empujón (S-03). */
  readonly shadowPath?: readonly SL.Pos[]
  /** Casilla del agujero que la sombra ha tapado en este turno (S-05). */
  readonly sunk?: SL.Pos
}

export type ShadowLogicGame = DeterministicGame<SL.Level, SL.Estado, SL.Direccion, SLFx>

export const shadowLogic: ShadowLogicGame = {
  id: 'shadow-logic',

  capabilities: {
    deterministic: true, // §38 — y verificado por las pruebas de contrato
    solvable: true, // BFS exhaustivo, Rulebook §11
    timed: false, // S-20: el tiempo se mide y se muestra, pero no puntúa
  },

  parseLevel,

  levelMeta: (l) => ({
    id: l.id,
    title: l.title,
    unit: l.case,
    ...(l.optimalMoves !== undefined ? { par: l.optimalMoves } : {}),
    ...(l.solutionPath !== undefined ? { solutionPath: l.solutionPath } : {}),
    ...(l.hintText !== undefined ? { hintText: l.hintText } : {}),
    ...(l.place !== undefined ? { place: l.place } : {}),
  }),

  initialState: SL.initialState,

  // Shadow Logic siempre ofrece las cuatro direcciones. El motor descarta las
  // nulas devolviendo {kind:'nothing'} (S-01) y el BFS las poda por ahí.
  inputs: () => SL.DIRECCIONES,

  hashState: SL.hashState,

  isVictory: (level, estado) => SL.isVictory(SL.compile(level), estado),

  step(level, estado, dir) {
    const r = SL.step(level, estado, dir)
    switch (r.kind) {
      case 'moved':
        return {
          kind: 'moved',
          state: r.estado,
          // S-01: si el motor devuelve 'moved', alguna entidad se desplazó.
          counted: true,
          won: r.won,
          fx: {
            path: r.path,
            ...(r.shadowPath ? { shadowPath: r.shadowPath } : {}),
            ...(r.sunk ? { sunk: r.sunk } : {}),
          },
        }
      case 'fell':
        // S-09: tropiezo cómico y reinicio. El contador se conserva.
        return { kind: 'failed', fx: { path: r.path } }
      case 'nothing':
        // S-01: un input que no produce desplazamiento no cuenta.
        return { kind: 'nothing' }
    }
  },
}
