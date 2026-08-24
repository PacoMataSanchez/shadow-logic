import type { Level, Pos } from '../src/engine/index.js'

/**
 * Construye un nivel de prueba a partir de un dibujo.
 * `D` = detective, `S` = sombra; ambos se sustituyen por suelo.
 */
export function lvl(draw: readonly string[], extra: Partial<Level> = {}): Level {
  let playerStart: Pos = [0, 0]
  let shadowStart: Pos = [0, 0]
  const grid = draw.map((line, r) =>
    [...line]
      .map((ch, c) => {
        if (ch === 'D') {
          playerStart = [r, c]
          return '.'
        }
        if (ch === 'S') {
          shadowStart = [r, c]
          return '.'
        }
        return ch
      })
      .join(''),
  )
  return {
    id: 'test',
    case: 0,
    title: 'test',
    grid,
    playerStart,
    shadowStart,
    doors: [],
    plates: [],
    ...extra,
  }
}
