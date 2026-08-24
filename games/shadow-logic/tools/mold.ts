/**
 * MOLDE — A-07, método de autoría "molde + generación".
 *
 * La generación libre produce puzzles correctos pero no habitaciones creíbles:
 * los muros salen dispersos y ningún tablero parece un sitio. Por eso:
 *
 *   1. Se dibuja A MANO la planta: muros, muebles, forma de la sala,
 *      y también las puertas, las zonas oscuras y los interruptores,
 *      que son arquitectura, no atrezzo.
 *   2. El generador coloca SOLO los elementos interactivos móviles:
 *      pistas, salida, placas, agujeros extra y posiciones iniciales.
 *   3. Se validan los candidatos y se elige.
 *
 * El trabajo humano pasa a ser dirección de arte y narrativa. La corrección
 * mecánica la garantiza la herramienta.
 */

import type { PosKey } from '../src/engine/index.js'

export interface Mold {
  readonly id: string
  readonly case: number
  readonly title: string
  readonly place: string
  /** Planta dibujada a mano. Caracteres permitidos: `#` `.` `+` `x` `!` `O`. */
  readonly grid: readonly string[]
  /** Un id por cada `+` del grid, en orden de lectura. */
  readonly doorIds?: readonly string[]
  /**
   * Zonas de autoría, mismas dimensiones que `grid`. Cada carácter etiqueta una
   * región ('A', 'B', …); `.` significa "sin restricción".
   *
   * Es la forma de que el autor diga *en qué habitación* va cada cosa sin decidir
   * la casilla exacta. Sin esto, el generador coloca la placa y el agujero donde
   * le da la gana y las combinaciones interesantes salen una vez de cada mil.
   */
  readonly zones?: readonly string[]
  readonly darkGroups?: Readonly<Record<PosKey, number>>
  readonly switchGroups?: Readonly<Record<PosKey, number>>
  readonly lightsOn?: readonly number[]
}

export interface GenSpec {
  readonly mold: Mold
  readonly levelId: string
  readonly title?: string
  /** Nº de pistas que coloca el generador. */
  readonly clues: number
  /** Agujeros extra, además de los que ya tenga el molde. */
  readonly holes?: number
  /** Nº de placas. Si el molde tiene puertas, todas se vinculan a la placa `p1`. */
  readonly plates?: number
  readonly minMoves?: number
  readonly maxMoves?: number
  /** `solutionCount` debe ser exactamente 1. Sello de calidad por defecto. */
  readonly uniqueSolution?: boolean
  /** Rulebook §11-BIS: por debajo de este cociente el nivel es un pasillo. */
  readonly minStateRatio?: number
  readonly require?: {
    readonly push?: boolean
    readonly bridge?: boolean
    readonly switch?: boolean
    readonly vanish?: boolean
  }
  /**
   * Restricción por zonas (ver `Mold.zones`). Valor: las etiquetas admitidas,
   * p. ej. `"A"` o `"AB"`. Lo que no se nombre va sin restricción.
   */
  readonly placement?: {
    readonly exit?: string
    readonly clues?: string
    readonly holes?: string
    readonly plates?: string
    readonly player?: string
    readonly shadow?: string
  }
  readonly tutorial?: boolean
  readonly hintText?: string
}
