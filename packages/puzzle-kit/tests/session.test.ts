/**
 * S-11 y S-15 sobre un juego de juguete.
 *
 * El juego de prueba no es Shadow Logic a propósito: si estas piezas funcionan
 * con un contador de tres botones, es que de verdad no saben qué juego llevan
 * dentro. Es el ensayo del «inquilino canario» a escala de laboratorio.
 */

import { describe, expect, it } from 'vitest'

import { Session, previewInput, resolveHint, type DeterministicGame } from '../src/index.js'

/** Sube de 0 a 3. `boom` pierde el intento. `nop` no hace nada. */
type Input = 'up' | 'boom' | 'nop'
interface Level { readonly target: number }
interface State { readonly n: number }

const toy: DeterministicGame<Level, State, Input, { from: number }> = {
  id: 'toy',
  capabilities: { deterministic: true, solvable: true, timed: false },
  parseLevel: (raw) => raw as Level,
  levelMeta: (l) => ({ id: 'toy-1', title: 'juguete', unit: 1, par: l.target }),
  initialState: () => ({ n: 0 }),
  inputs: () => ['up', 'boom', 'nop'],
  hashState: (s) => String(s.n),
  isVictory: (l, s) => s.n >= l.target,
  step(level, state, input) {
    if (input === 'nop') return { kind: 'nothing' }
    if (input === 'boom') return { kind: 'failed', fx: { from: state.n } }
    const n = state.n + 1
    return { kind: 'moved', state: { n }, counted: true, won: n >= level.target, fx: { from: state.n } }
  },
}

const level: Level = { target: 3 }

describe('S-11 · deshacer ilimitado, contador irreversible', () => {
  it('el contador sube al avanzar', () => {
    const s = new Session(toy, level)
    s.play('up')
    s.play('up')
    expect(s.attempt.moves).toBe(2)
    expect(s.current.n).toBe(2)
  })

  it('deshacer devuelve el estado pero NO baja el contador', () => {
    const s = new Session(toy, level)
    s.play('up')
    s.play('up')
    s.undo()
    expect(s.current.n).toBe(1)
    expect(s.attempt.moves).toBe(2) // explorar es gratis; el óptimo hay que planificarlo
  })

  it('no se puede deshacer más allá del principio', () => {
    const s = new Session(toy, level)
    expect(s.undo()).toBe(false)
  })

  it('un input nulo no cuenta ni cambia nada', () => {
    const s = new Session(toy, level)
    const r = s.play('nop')
    expect(r.kind).toBe('nothing')
    expect(s.attempt.moves).toBe(0)
    expect(s.attempt.canUndo).toBe(false)
  })

  it('perder el intento reinicia el estado pero conserva el contador', () => {
    const s = new Session(toy, level)
    s.play('up')
    s.play('boom')
    expect(s.current.n).toBe(0) // vuelta al inicio
    expect(s.attempt.moves).toBe(2) // el movimiento fatal también contó
    expect(s.attempt.restarts).toBe(1)
  })

  it('RESTART manual lo pone todo a cero, contador incluido', () => {
    const s = new Session(toy, level)
    s.play('up')
    s.restart()
    expect(s.attempt.moves).toBe(0)
    expect(s.current.n).toBe(0)
  })

  it('al ganar deja de aceptar entradas', () => {
    const s = new Session(toy, level)
    s.play('up')
    s.play('up')
    s.play('up')
    expect(s.attempt.won).toBe(true)
    expect(s.play('up').kind).toBe('nothing')
  })
})

describe('S-14 · previsualización', () => {
  it('modo full muestra siempre', () => {
    const p = previewInput(toy, level, { n: 0 }, 'up', 'full')
    expect(p.visible).toBe(true)
    expect(p.dangerous).toBe(false)
  })

  it('modo danger solo muestra lo que mata', () => {
    expect(previewInput(toy, level, { n: 0 }, 'up', 'danger').visible).toBe(false)
    const boom = previewInput(toy, level, { n: 0 }, 'boom', 'danger')
    expect(boom.dangerous).toBe(true)
    expect(boom.visible).toBe(true)
  })

  it('modo none no muestra nada, ni siquiera el peligro', () => {
    expect(previewInput(toy, level, { n: 0 }, 'boom', 'none').visible).toBe(false)
  })

  it('previsualizar no aplica el movimiento', () => {
    const s = new Session(toy, level)
    previewInput(toy, level, s.current, 'up', 'full')
    expect(s.current.n).toBe(0)
    expect(s.attempt.moves).toBe(0)
  })
})

describe('S-15 · la escalera de pistas', () => {
  const ladder = ['concept', 'nextMove', 'nextMove', 'nextMove', 'solutionMinusLast'] as const
  const path: Input[] = ['up', 'up', 'up']

  it('el primer peldaño es el texto escrito a mano', () => {
    const h = resolveHint({ pathFromHere: path, hintText: 'sube', ladder, rung: 1 })
    expect(h).toEqual({ kind: 'concept', text: 'sube' })
  })

  it('los peldaños 2 a 4 revelan un movimiento cada vez', () => {
    for (const rung of [2, 3, 4]) {
      const h = resolveHint({ pathFromHere: path, ladder, rung })
      expect(h.kind).toBe('moves')
      if (h.kind === 'moves') expect(h.moves).toHaveLength(1)
    }
  })

  it('el quinto da la solución MENOS el último paso', () => {
    const h = resolveHint({ pathFromHere: path, ladder, rung: 5 })
    expect(h.kind).toBe('moves')
    if (h.kind === 'moves') {
      expect(h.moves).toEqual(['up', 'up'])
      expect(h.moves).toHaveLength(path.length - 1)
    }
  })

  it('sin texto escrito, el primer peldaño avisa en vez de mentir', () => {
    expect(resolveHint({ pathFromHere: path, ladder, rung: 1 }).kind).toBe('unavailable')
  })
})
