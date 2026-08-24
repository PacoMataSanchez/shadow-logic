/**
 * EL CONTRATO — Aplicación Maestra v0.3 §4.1
 *
 * Lo que un juego tiene que ofrecer para que la carcasa lo monte.
 * Este fichero no importa nada: ni React, ni Node, ni React Native.
 *
 * Familia cubierta: juegos móviles POR NIVELES. El jugador entra a un nivel,
 * hace algo, el nivel termina, se puntúa y se desbloquea el siguiente. Los
 * infinitos, el tiempo real multijugador y el mundo persistente quedan fuera a
 * propósito: estirar la carcasa para que quepan es cómo mueren las plataformas.
 */

/**
 * Lo que el juego declara sobre sí mismo. La carcasa enciende o apaga funciones
 * en consecuencia — es lo que permite que un arcade sin solver use las mismas
 * 13 pantallas que un puzzle determinista.
 */
export interface Capabilities {
  /** Mismo estado + mismo input = mismo resultado. Habilita deshacer, previsualización y repetición. */
  readonly deterministic: boolean
  /** Existe un solver que da la solución óptima. Habilita pistas, estrellas por óptimo y generación. */
  readonly solvable: boolean
  /** El reloj forma parte de la partida. Habilita cronómetro y récords. */
  readonly timed: boolean
}

export interface LevelMeta {
  readonly id: string
  readonly title: string
  /** «caso» en Shadow Logic, «mundo» en otro juego. La etiqueta la pone el manifiesto. */
  readonly unit: number
  /** Referencia de puntuación: óptimo de movimientos, o puntuación objetivo. */
  readonly par?: number
  /** Solo con `solvable`. La carcasa no lo interpreta: se lo pasa al kit de pistas. */
  readonly solutionPath?: readonly unknown[]
  readonly hintText?: string
  readonly place?: string
}

/** Contrato base. Todo juego de la familia lo implementa. */
export interface LevelGame<L> {
  readonly id: string
  readonly capabilities: Capabilities

  /** Aduana de esquema. Debe lanzar si el dato está mal formado. */
  parseLevel(raw: unknown): L
  levelMeta(level: L): LevelMeta
}

export interface AttemptSummary {
  /** Movimientos en un puzzle, puntos en un arcade. La dirección la fija el manifiesto. */
  readonly score: number
  readonly usedHints: number
  readonly restarts: number
  /** Milisegundos. Se mide fuera del motor (S-20). */
  readonly elapsedMs?: number
}

/**
 * Lo que la carcasa necesita para dibujar el HUD sin saber qué es una pista.
 * `done/total` es «3 de 5 pistas», «2 de 4 cajas», «7 de 9 letras».
 */
export interface SessionHost {
  onProgress(done: number, total: number): void
  onScore(score: number): void
  onWin(summary: AttemptSummary): void
  onFail(reason?: string): void
}
