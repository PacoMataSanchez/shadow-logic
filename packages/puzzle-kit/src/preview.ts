/**
 * S-14 — previsualización del destino.
 *
 * > Se implementa llamando a `step()` y DIBUJANDO el resultado en vez de
 * > aplicarlo. Cero lógica duplicada.
 *
 * La carcasa decide el modo (es un ajuste del jugador); el juego decide qué se
 * pinta a partir de `fx`. Esta capa solo hace de puente, y su valor está en que
 * garantiza que la previsualización no puede mentir: usa exactamente el mismo
 * `step()` que la jugada real.
 *
 * Restricción vinculante del Rulebook: ningún nivel puede diseñarse asumiendo la
 * previsualización. Todo puzzle debe ser justo en modo `none` — lo comprueba la
 * validación 5 en autoría, no esta capa.
 */

import type { PreviewMode } from '@game/core'
import type { DeterministicGame, TurnResult } from './deterministic.js'

export interface Preview<S, FX> {
  readonly result: TurnResult<S, FX>
  /** ¿Este input llevaría a perder el intento? Lo único que muestra el modo `danger`. */
  readonly dangerous: boolean
  /** ¿Hay algo que dibujar en este modo? */
  readonly visible: boolean
}

export function previewInput<L, S, I, FX>(
  game: DeterministicGame<L, S, I, FX>,
  level: L,
  state: S,
  input: I,
  mode: PreviewMode,
): Preview<S, FX> {
  const result = game.step(level, state, input)
  const dangerous = result.kind === 'failed'
  const visible = mode === 'full' || (mode === 'danger' && dangerous)
  return { result, dangerous, visible }
}
