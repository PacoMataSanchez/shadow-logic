/**
 * Progresión — Rulebook §8, generalizado.
 *
 * Lo que se prueba aquí es la promesa de la carcasa: que el mismo bloque de
 * estrellas sirve a un puzzle donde se busca el mínimo y a un arcade donde se
 * busca el máximo, sin tocar código.
 */

import { describe, expect, it } from 'vitest'

import { evaluate, type AttemptSummary, type Manifest } from '../src/index.js'

const base = (over: Partial<Manifest['progression']>): Manifest =>
  ({
    progression: {
      scoreDirection: 'lower-is-better',
      stars: [
        { n: 3, when: 'score <= par' },
        { n: 2, when: 'score <= par * 1.3' },
        { n: 1, when: 'completed' },
      ],
      perfect: { parExact: true, noHints: true },
      xp: { perStar: 10, perPerfect: 25 },
      timer: { track: true, scores: false },
      ...over,
    },
  }) as Manifest

const attempt = (over: Partial<AttemptSummary> = {}): AttemptSummary => ({
  score: 10,
  usedHints: 0,
  restarts: 0,
  ...over,
})

describe('estrellas · menor es mejor (puzzle)', () => {
  const m = base({})

  it('tres estrellas al alcanzar el óptimo', () => {
    expect(evaluate(m, 10, attempt({ score: 10 }), true).stars).toBe(3)
  })

  it('dos estrellas dentro del 30 %', () => {
    expect(evaluate(m, 10, attempt({ score: 13 }), true).stars).toBe(2)
  })

  it('una estrella por completar', () => {
    expect(evaluate(m, 10, attempt({ score: 40 }), true).stars).toBe(1)
  })

  it('ninguna si no se completó', () => {
    expect(evaluate(m, 10, attempt({ score: 10 }), false).stars).toBe(0)
  })
})

describe('estrellas · mayor es mejor (arcade)', () => {
  const m = base({ scoreDirection: 'higher-is-better' })

  it('tres estrellas al llegar al objetivo', () => {
    expect(evaluate(m, 100, attempt({ score: 120 }), true).stars).toBe(3)
  })

  it('dos estrellas cerca del objetivo', () => {
    expect(evaluate(m, 100, attempt({ score: 80 }), true).stars).toBe(2)
  })

  it('una estrella por completar', () => {
    expect(evaluate(m, 100, attempt({ score: 10 }), true).stars).toBe(1)
  })
})

describe('PERFECTO', () => {
  const m = base({})

  it('exige óptimo exacto y cero pistas', () => {
    expect(evaluate(m, 10, attempt({ score: 10, usedHints: 0 }), true).perfect).toBe(true)
    expect(evaluate(m, 10, attempt({ score: 10, usedHints: 1 }), true).perfect).toBe(false)
    expect(evaluate(m, 10, attempt({ score: 11, usedHints: 0 }), true).perfect).toBe(false)
  })

  it('los reinicios no lo anulan: ya penalizan por el contador', () => {
    expect(evaluate(m, 10, attempt({ score: 10, restarts: 3 }), true).perfect).toBe(true)
  })
})

describe('XP', () => {
  it('suma por estrella y añade el sello PERFECTO', () => {
    const m = base({})
    expect(evaluate(m, 10, attempt({ score: 10 }), true).xp).toBe(3 * 10 + 25)
    expect(evaluate(m, 10, attempt({ score: 13 }), true).xp).toBe(2 * 10)
  })
})
