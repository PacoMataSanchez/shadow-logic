/**
 * S-11 — deshacer ilimitado, contador irreversible.
 *
 * > El jugador puede deshacer cuantos movimientos quiera, pero el contador no
 * > baja. Explorar es gratis; alcanzar el óptimo exige haberlo planificado.
 *
 * Esta es UNA SOLA implementación para todos los juegos deterministas, y sale
 * casi gratis porque el contrato exige estados inmutables. Es el ejemplo más
 * claro de por qué el determinismo, que se pidió por otra razón, acaba pagando
 * en funciones de producto.
 */

import type { DeterministicGame, TurnResult } from './deterministic.js'

export interface Attempt<S> {
  readonly state: S
  /** Nunca baja, ni al deshacer ni al reiniciar tras fallo. */
  readonly moves: number
  readonly restarts: number
  readonly hintsUsed: number
  readonly canUndo: boolean
  readonly won: boolean
}

export class Session<L, S, I, FX> {
  private stack: S[]
  private movesCount = 0
  private restartsCount = 0
  private hints = 0
  private victory = false

  constructor(
    private readonly game: DeterministicGame<L, S, I, FX>,
    private readonly level: L,
  ) {
    this.stack = [game.initialState(level)]
    this.victory = game.isVictory(level, this.stack[0] as S)
  }

  get current(): S {
    return this.stack[this.stack.length - 1] as S
  }

  get attempt(): Attempt<S> {
    return {
      state: this.current,
      moves: this.movesCount,
      restarts: this.restartsCount,
      hintsUsed: this.hints,
      canUndo: this.stack.length > 1,
      won: this.victory,
    }
  }

  /** Aplica un input. Devuelve el resultado crudo para que el render anime `fx`. */
  play(input: I): TurnResult<S, FX> {
    if (this.victory) return { kind: 'nothing' }
    const r = this.game.step(this.level, this.current, input)

    if (r.kind === 'moved') {
      this.stack.push(r.state)
      if (r.counted) this.movesCount++
      this.victory = r.won
    } else if (r.kind === 'failed') {
      // El intento fatal SÍ fue un desplazamiento: cuenta, y luego se reinicia.
      this.movesCount++
      this.restartsCount++
      this.stack = [this.game.initialState(this.level)]
    }
    return r
  }

  /** S-11: vuelve atrás una posición. El contador NO baja. */
  undo(): boolean {
    if (this.stack.length <= 1) return false
    this.stack.pop()
    this.victory = false
    return true
  }

  /** RESTART manual del jugador (§40): el nivel empieza de cero, contador incluido. */
  restart(): void {
    this.stack = [this.game.initialState(this.level)]
    this.movesCount = 0
    this.restartsCount = 0
    this.hints = 0
    this.victory = false
  }

  noteHintUsed(): void {
    this.hints++
  }
}
