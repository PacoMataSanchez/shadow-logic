/**
 * SHADOW LOGIC — tipos del motor.
 * Rulebook v2.7 · Arquitectura v2.0 (A-03: estado como objetos planos inmutables)
 *
 * Este módulo no importa nada. `engine/` no conoce React, ni el tiempo, ni el azar.
 */

export type Pos = readonly [row: number, col: number]

/** Clave canónica de una casilla: `"fila,columna"`. Fuente única de verdad. */
export type PosKey = string

export type Direccion = 'U' | 'D' | 'L' | 'R'

export const DIRECCIONES: readonly Direccion[] = ['U', 'D', 'L', 'R'] as const

export const DELTA: Readonly<Record<Direccion, Pos>> = {
  U: [-1, 0],
  D: [1, 0],
  L: [0, -1],
  R: [0, 1],
}

/** Vocabulario del MVP — Rulebook §7. */
export const TERRENO = {
  SUELO: '.',
  PARED: '#',
  PISTA: '*',
  SALIDA: 'E',
  AGUJERO: 'O',
  PLACA: '_',
  PUERTA: '+',
  OSCURIDAD: 'x',
  INTERRUPTOR: '!',
} as const

export type Terreno = (typeof TERRENO)[keyof typeof TERRENO]

export const TERRENOS_VALIDOS: ReadonlySet<string> = new Set(Object.values(TERRENO))

export interface DoorDef {
  readonly id: string
  readonly pos: Pos
  readonly controlledBy: readonly string[]
  readonly logic: 'AND' | 'OR'
}

export interface PlateDef {
  readonly id: string
  readonly pos: Pos
}

export interface Level {
  readonly id: string
  readonly case: number
  readonly title: string
  readonly place?: string

  readonly grid: readonly string[]
  readonly playerStart: Pos
  readonly shadowStart: Pos

  readonly doors: readonly DoorDef[]
  readonly plates: readonly PlateDef[]

  /** Caso 02+. Casilla oscura -> grupo de luz que la ilumina. Oscura mientras el grupo esté apagado. */
  readonly darkGroups?: Readonly<Record<PosKey, number>>
  /** Caso 02+. Casilla interruptor -> grupo de luz que conmuta (S-18). */
  readonly switchGroups?: Readonly<Record<PosKey, number>>
  /** Grupos encendidos al empezar el nivel. */
  readonly lightsOn?: readonly number[]

  // --- lo escribe el generador; no se edita a mano ---
  readonly optimalMoves?: number
  readonly solutionPath?: readonly Direccion[]
  readonly solutionCount?: number
  readonly rulesHash?: string

  readonly tutorial?: boolean
  readonly hintText?: string
}

/**
 * Estado del puzzle.
 *
 * `moves` NO forma parte de la clave de estado: en el BFS lo representa la profundidad.
 * Placas y puertas NO están aquí: se derivan de la posición de la sombra (S-06).
 * La luz SÍ está, porque el interruptor es un cambio persistente (S-18).
 */
export interface Estado {
  readonly det: Pos
  /** `null` = fuera de juego para siempre (S-05, cayó en un agujero). */
  readonly sha: Pos | null
  /**
   * S-19: la sombra existe pero está ausente por falta de luz.
   * `sha` conserva la casilla a la que volverá cuando la luz regrese y la casilla quede libre.
   */
  readonly shaAbsent: boolean
  /** Pistas recogidas (S-08: solo el detective). */
  readonly got: ReadonlySet<PosKey>
  /** Agujeros tapados por la sombra (S-05). Nunca se destapan. */
  readonly filled: ReadonlySet<PosKey>
  /** Grupos de luz encendidos (S-18). */
  readonly lights: ReadonlySet<number>
  readonly moves: number
}

export type Resultado =
  /** Hubo desplazamiento de alguna entidad. El contador ya viene incrementado (paso 6). */
  | {
      kind: 'moved'
      estado: Estado
      /** Recorrido del detective, casilla a casilla, incluida la de partida. Para animación y S-14. */
      path: readonly Pos[]
      /** Recorrido de la sombra empujada, si hubo empujón (S-03). */
      shadowPath?: readonly Pos[]
      /** Casilla del agujero que la sombra ha tapado en este turno (S-05). */
      sunk?: Pos
      /** S-07: el caso queda resuelto con este turno. */
      won: boolean
    }
  /** S-09: el detective entró en un agujero sin tapar. El nivel se reinicia; el contador se conserva. */
  | { kind: 'fell'; path: readonly Pos[] }
  /** S-01: ningún desplazamiento. No cuenta como movimiento. */
  | { kind: 'nothing' }

export function key(p: Pos): PosKey {
  return `${p[0]},${p[1]}`
}

export function parseKey(k: PosKey): Pos {
  const i = k.indexOf(',')
  return [Number(k.slice(0, i)), Number(k.slice(i + 1))]
}

export function samePos(a: Pos, b: Pos): boolean {
  return a[0] === b[0] && a[1] === b[1]
}
