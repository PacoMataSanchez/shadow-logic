/**
 * TEMA — tokens, nunca estilos sueltos.
 *
 * La carcasa y el kit de UI solo consumen tokens; jamás un color literal.
 *
 * `board` es la puerta trasera deliberada: la piel del tablero —tiles, sprites,
 * paleta del pixel art— la define el juego y el tema solo se la entrega. Sin
 * esto, la carcasa acabaría teniendo opiniones sobre cómo se dibuja una pared,
 * que es justo lo que no debe pasar.
 */

/** Opaco para la carcasa. Lo interpreta el renderizador del juego. */
export type BoardSkin = Readonly<Record<string, unknown>>

export interface Theme {
  readonly mode: 'light' | 'dark' | 'auto'

  readonly color: {
    readonly bg: string
    readonly surface: string
    readonly surfaceAlt: string
    readonly ink: string
    readonly inkMuted: string
    readonly accent: string
    readonly accentInk: string
    readonly success: string
    readonly warning: string
    readonly danger: string
    readonly star: string
    readonly starEmpty: string
  }

  readonly type: {
    readonly display: string
    readonly title: string
    readonly body: string
    readonly mono: string
    readonly scale: readonly number[]
  }

  readonly space: readonly number[]
  readonly radius: { readonly sm: number; readonly md: number; readonly lg: number; readonly pill: number }
  readonly motion: { readonly fast: number; readonly base: number; readonly slow: number; readonly easing: string }
  readonly sound: Readonly<Record<'tap' | 'success' | 'fail' | 'star' | 'hint', string | null>>
  readonly icons: Readonly<Record<string, string>>

  readonly board: BoardSkin
}
