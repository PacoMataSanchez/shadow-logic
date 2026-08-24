/**
 * ASCII ↔ nivel. Herramienta de lectura humana.
 *
 * Sirve para revisar un nivel en la terminal sin abrir el juego, y para pegar
 * un tablero en una conversación de diseño. No es un formato de datos: el
 * formato de datos es el JSON.
 */

import {
  type Estado,
  type Level,
  compile,
  initialState,
  key,
  step,
  terrainAt,
  type Direccion,
} from '../src/engine/index.js'

const ICON: Record<string, string> = {
  '.': '·',
  '#': '█',
  '*': '*',
  E: 'E',
  O: 'O',
  _: '_',
  '+': '+',
  x: 'x',
  '!': '!',
}

export function render(level: Level, estado: Estado = initialState(level)): string {
  const cl = compile(level)
  const lines: string[] = []
  for (let r = 0; r < cl.rows; r++) {
    let line = ''
    for (let c = 0; c < cl.cols; c++) {
      const p: [number, number] = [r, c]
      const k = key(p)
      if (estado.det[0] === r && estado.det[1] === c) line += 'D'
      else if (estado.sha && !estado.shaAbsent && estado.sha[0] === r && estado.sha[1] === c) line += 'S'
      else if (estado.sha && estado.shaAbsent && estado.sha[0] === r && estado.sha[1] === c) line += 's'
      else if (estado.filled.has(k)) line += '▒'
      else if (estado.got.has(k)) line += '·'
      else line += ICON[terrainAt(cl, p)] ?? '?'
    }
    lines.push(line)
  }
  return lines.join('\n')
}

/** Imprime la solución paso a paso. Es la mejor forma de auditar un nivel a ojo. */
export function renderSolution(level: Level, path: readonly Direccion[]): string {
  const out: string[] = [`${level.id} — ${level.title}`, render(level), '']
  let estado = initialState(level)
  for (const [i, dir] of path.entries()) {
    const res = step(level, estado, dir)
    if (res.kind !== 'moved') {
      out.push(`paso ${i + 1} (${dir}): ${res.kind}`)
      break
    }
    estado = res.estado
    out.push(`paso ${i + 1} — ${dir}${res.sunk ? '  (la sombra tapa el agujero)' : ''}${res.won ? '  ← CASO CERRADO' : ''}`)
    out.push(render(level, estado))
    out.push('')
  }
  return out.join('\n')
}
