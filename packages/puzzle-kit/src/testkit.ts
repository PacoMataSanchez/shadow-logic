/**
 * PRUEBAS DE CONTRATO — las hereda todo juego determinista.
 *
 * Un juego nuevo escribe una línea y arranca con la red puesta desde el primer
 * día. Comprueban lo que el Prompt Maestro §38 y el Rulebook §13 exigen, sin
 * saber nada del juego concreto.
 *
 *     describeContract('shadow-logic', shadowLogic, LEVELS)
 */

import { describe, expect, it } from 'vitest'

import type { DeterministicGame } from './deterministic.js'
import { Session } from './history.js'

export function describeContract<L, S, I, FX>(
  name: string,
  game: DeterministicGame<L, S, I, FX>,
  levels: readonly L[],
  sequences?: ReadonlyMap<string, readonly I[]>,
): void {
  describe(`contrato · ${name}`, () => {
    it('declara capacidades coherentes', () => {
      expect(game.capabilities.deterministic).toBe(true)
      expect(typeof game.id).toBe('string')
      expect(levels.length).toBeGreaterThan(0)
    })

    for (const level of levels) {
      const meta = game.levelMeta(level)

      describe(meta.id, () => {
        it('initialState es determinista', () => {
          const a = game.hashState(game.initialState(level))
          for (let i = 0; i < 10; i++) {
            expect(game.hashState(game.initialState(level))).toBe(a)
          }
        })

        it('step no muta el estado que recibe', () => {
          const s = game.initialState(level)
          const before = game.hashState(s)
          for (const input of game.inputs(level, s)) game.step(level, s, input)
          expect(game.hashState(s)).toBe(before)
        })

        it('inputs() no depende del orden de llamada', () => {
          const s = game.initialState(level)
          const a = [...game.inputs(level, s)]
          const b = [...game.inputs(level, s)]
          expect(b).toEqual(a)
        })

        it('un resultado `nothing` deja el mundo igual', () => {
          const s = game.initialState(level)
          const before = game.hashState(s)
          for (const input of game.inputs(level, s)) {
            const r = game.step(level, s, input)
            if (r.kind === 'nothing') expect(game.hashState(s)).toBe(before)
          }
        })

        it('isVictory es estable para el mismo estado', () => {
          const s = game.initialState(level)
          const v = game.isVictory(level, s)
          for (let i = 0; i < 5; i++) expect(game.isVictory(level, s)).toBe(v)
        })

        const seq = sequences?.get(meta.id)
        if (seq) {
          it('misma secuencia, mismo estado final, 20 veces', () => {
            const run = (): string => {
              let s = game.initialState(level)
              for (const input of seq) {
                const r = game.step(level, s, input)
                if (r.kind === 'moved') s = r.state
              }
              return game.hashState(s)
            }
            const first = run()
            for (let i = 0; i < 20; i++) expect(run()).toBe(first)
          })

          it('el contador sube solo cuando el juego dice que cuenta', () => {
            const session = new Session(game, level)
            let expected = 0
            for (const input of seq) {
              const r = session.play(input)
              if (r.kind === 'moved' && r.counted) expected++
              else if (r.kind === 'failed') expected++
              expect(session.attempt.moves).toBe(expected)
            }
          })

          it('deshacer devuelve el estado pero no baja el contador (S-11)', () => {
            const session = new Session(game, level)
            const first = seq[0]
            if (first === undefined) return
            const start = game.hashState(session.current)
            const r = session.play(first)
            if (r.kind !== 'moved') return
            const moves = session.attempt.moves
            expect(session.undo()).toBe(true)
            expect(game.hashState(session.current)).toBe(start)
            expect(session.attempt.moves).toBe(moves)
          })
        }
      })
    }
  })
}
