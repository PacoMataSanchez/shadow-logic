/**
 * EL MANIFIESTO — Aplicación Maestra v0.3 §5.
 *
 * Describe VALORES y CONMUTADORES, nunca estructura.
 *
 * Regla de decisión: si dos juegos razonables querrían el mismo comportamiento
 * con distinto número, va aquí. Si querrían comportamiento distinto, va al
 * código del juego. Y si una entrada necesita un `if`, va al código.
 */

export type ScoreDirection = 'lower-is-better' | 'higher-is-better'

export interface StarRule {
  readonly n: 1 | 2 | 3
  /** Expresión sobre `score`, `par` y `completed`. Sin condicionales: umbral y ya. */
  readonly when: string
}

export interface UnitDef {
  readonly id: number
  readonly title: string
  readonly levels: number
  readonly illustration?: string
}

export interface Manifest {
  readonly app: {
    readonly id: string
    readonly name: string
    readonly bundleId: string
    readonly locales: readonly string[]
    readonly orientation: 'portrait' | 'landscape'
  }

  readonly content: {
    readonly game: string
    readonly unitLabel: { readonly one: string; readonly many: string }
    readonly units: readonly UnitDef[]
    readonly unlock: { readonly rule: 'previousComplete' | 'starsTotal'; readonly starsRequired: number }
  }

  readonly progression: {
    readonly scoreDirection: ScoreDirection
    readonly stars: readonly StarRule[]
    readonly perfect: { readonly parExact: boolean; readonly noHints: boolean }
    readonly xp: { readonly perStar: number; readonly perPerfect: number }
    readonly timer: { readonly track: boolean; readonly scores: boolean }
  }

  readonly hints: {
    readonly ladder: readonly HintRung[]
    readonly gate: { readonly freeRungs: number }
    readonly recomputeFromCurrentState: boolean
  }

  readonly monetization: {
    readonly interstitial: { readonly everyNLevels: number; readonly skipWhen: readonly string[] }
    readonly rewarded: { readonly unlocks: readonly string[] }
    readonly currency: { readonly soft: boolean; readonly hard: boolean; readonly buys: readonly string[] }
    readonly iap: readonly string[]
  }

  readonly screens: {
    readonly enabled: readonly ScreenId[]
    readonly disabled: readonly ScreenId[]
  }

  readonly settings: {
    readonly preview: { readonly modes: readonly PreviewMode[]; readonly default: PreviewMode }
    readonly haptics: boolean
    readonly sound: boolean
    readonly music: boolean
  }

  readonly telemetry: { readonly events: readonly string[] }
}

export type HintRung = 'concept' | 'nextMove' | 'solutionMinusLast' | 'solution'

export type PreviewMode = 'full' | 'danger' | 'none'

/** Las 13 pantallas del Prompt Maestro §42. */
export type ScreenId =
  | 'splash' | 'menu' | 'map' | 'levelSelect' | 'game' | 'pause'
  | 'levelComplete' | 'unitComplete' | 'profile' | 'customization'
  | 'dailyPuzzle' | 'settings' | 'shop'
