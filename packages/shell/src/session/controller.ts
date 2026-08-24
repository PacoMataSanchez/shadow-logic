/**
 * EL CONTROLADOR DE PARTIDA.
 *
 * Lo que la pantalla de juego enciende y a lo que se ata la UI. Une cuatro cosas
 * que hasta ahora estaban sueltas:
 *
 *   · la sesión del kit          deshacer, contador, reinicio  (S-11)
 *   · la progresión del core     estrellas, PERFECTO, XP
 *   · la escalera de pistas      S-15, con recálculo si el jugador se desvió
 *   · la telemetría              el dato que el MVP existe para obtener
 *
 * No sabe qué juego lleva dentro. Toda la parte específica entra por el
 * contrato, y el reloj entra inyectado: S-20 exige medir el tiempo **fuera del
 * motor**, y pasarlo como dependencia además lo hace comprobable.
 */

import {
  evaluate,
  type AttemptSummary,
  type Manifest,
  type Outcome,
  type PreviewMode,
} from '@game/core'
import {
  findPath,
  previewInput,
  resolveHint,
  Session,
  type DeterministicGame,
  type Hint,
  type Preview,
  type TurnResult,
} from '@puzzle/kit'

import { TelemetryQueue } from '../telemetry/queue.js'

export interface ControllerDeps {
  readonly manifest: Manifest
  readonly now: () => number
  readonly telemetry?: TelemetryQueue
}

export interface GameView<S> {
  readonly state: S
  readonly moves: number
  readonly restarts: number
  readonly hintsUsed: number
  readonly canUndo: boolean
  readonly won: boolean
  /** Milisegundos desde el primer input. S-20: se muestra, no puntúa. */
  readonly elapsedMs: number
  /** Siguiente peldaño de pista disponible, base 1. */
  readonly nextHintRung: number
  readonly hintCostsAd: boolean
}

export class LevelController<L, S, I, FX> {
  private readonly session: Session<L, S, I, FX>
  private startedAt: number | null = null
  private finishedAt: number | null = null
  private hintRung = 0

  constructor(
    private readonly game: DeterministicGame<L, S, I, FX>,
    private readonly level: L,
    private readonly deps: ControllerDeps,
  ) {
    this.session = new Session(game, level)
  }

  get view(): GameView<S> {
    const a = this.session.attempt
    return {
      state: a.state,
      moves: a.moves,
      restarts: a.restarts,
      hintsUsed: a.hintsUsed,
      canUndo: a.canUndo,
      won: a.won,
      elapsedMs: this.elapsedMs,
      nextHintRung: this.hintRung + 1,
      hintCostsAd: this.hintRung + 1 > this.deps.manifest.hints.gate.freeRungs,
    }
  }

  /**
   * S-20 — el reloj corre desde el primer input y se detiene al ganar. El
   * reinicio por fallo NO lo pone a cero, igual que el contador de movimientos.
   */
  private get elapsedMs(): number {
    if (this.startedAt === null) return 0
    return (this.finishedAt ?? this.deps.now()) - this.startedAt
  }

  play(input: I): TurnResult<S, FX> {
    if (this.startedAt === null) this.startedAt = this.deps.now()
    const before = this.session.attempt.moves
    const r = this.session.play(input)

    if (r.kind === 'failed') {
      this.deps.telemetry?.record('levelFail', { moves: before })
    }
    if (this.session.attempt.won) {
      this.finishedAt = this.deps.now()
      this.deps.telemetry?.record('levelComplete', {
        moves: this.session.attempt.moves,
        hints: this.session.attempt.hintsUsed,
        restarts: this.session.attempt.restarts,
        ms: this.elapsedMs,
      })
    }
    return r
  }

  /** S-14 — dibuja el resultado en vez de aplicarlo. Cero lógica duplicada. */
  preview(input: I, mode: PreviewMode): Preview<S, FX> {
    return previewInput(this.game, this.level, this.session.current, input, mode)
  }

  undo(): boolean {
    const ok = this.session.undo()
    if (ok) this.deps.telemetry?.record('undo', { moves: this.session.attempt.moves })
    return ok
  }

  restart(): void {
    this.session.restart()
    this.startedAt = null
    this.finishedAt = null
    this.hintRung = 0
    this.deps.telemetry?.record('restart')
  }

  /**
   * Siguiente peldaño de la escalera (S-15).
   *
   * La ruta se recalcula **desde el estado actual** cuando el manifiesto lo pide:
   * si el jugador se ha desviado de la solución guardada, darle la ruta original
   * sería darle instrucciones que ya no puede seguir.
   */
  hint(storedPath?: readonly I[]): Hint<I> {
    const rung = this.hintRung + 1
    const ladder = this.deps.manifest.hints.ladder

    const path = this.deps.manifest.hints.recomputeFromCurrentState
      ? (findPath(this.game, this.level, this.session.current) ?? storedPath ?? [])
      : (storedPath ?? [])

    const meta = this.game.levelMeta(this.level)
    const result = resolveHint({
      pathFromHere: path,
      ...(meta.hintText !== undefined ? { hintText: meta.hintText } : {}),
      ladder,
      rung,
    })

    if (result.kind !== 'unavailable') {
      this.hintRung = rung
      this.session.noteHintUsed()
      this.deps.telemetry?.record('hintUsed', {
        rung,
        moves: this.session.attempt.moves,
        restarts: this.session.attempt.restarts,
      })
    }
    return result
  }

  get summary(): AttemptSummary {
    const a = this.session.attempt
    return {
      score: a.moves,
      usedHints: a.hintsUsed,
      restarts: a.restarts,
      ...(this.deps.manifest.progression.timer.track ? { elapsedMs: this.elapsedMs } : {}),
    }
  }

  outcome(): Outcome {
    const par = this.game.levelMeta(this.level).par
    return evaluate(this.deps.manifest, par, this.summary, this.session.attempt.won)
  }
}
