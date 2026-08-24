/**
 * La carcasa, probada sin ningún juego dentro.
 *
 * Si estas pruebas pasan usando un contador de tres botones como «juego», es que
 * la carcasa de verdad no sabe qué lleva dentro.
 */

import { describe, expect, it } from 'vitest'

import type { Manifest } from '@game/core'
import type { DeterministicGame } from '@puzzle/kit'

import {
  afterInterstitial,
  afterLevelCompleted,
  afterRewarded,
  EMPTY_PROGRESS,
  isUnlocked,
  LevelController,
  migrate,
  recordLevel,
  shouldShowInterstitial,
  TelemetryQueue,
  totalStars,
} from '../src/index.js'

const manifest: Manifest = {
  app: { id: 't', name: 'T', bundleId: 'x', locales: ['es'], orientation: 'portrait' },
  content: {
    game: 'toy',
    unitLabel: { one: 'caso', many: 'casos' },
    units: [{ id: 1, title: 'uno', levels: 2 }],
    unlock: { rule: 'previousComplete', starsRequired: 0 },
  },
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
  },
  hints: {
    ladder: ['concept', 'nextMove', 'nextMove', 'nextMove', 'solutionMinusLast'],
    gate: { freeRungs: 2 },
    recomputeFromCurrentState: true,
  },
  monetization: {
    interstitial: {
      everyNLevels: 5,
      skipWhen: ['afterFailure', 'duringUnit:1', 'betweenCutscenes', 'afterRewarded'],
    },
    rewarded: { unlocks: ['hintRung:3'] },
    currency: { soft: true, hard: false, buys: ['cosmetics'] },
    iap: ['removeAds'],
  },
  screens: { enabled: ['game'], disabled: ['shop'] },
  settings: { preview: { modes: ['full', 'danger', 'none'], default: 'full' }, haptics: true, sound: true, music: true },
  telemetry: { events: ['levelComplete', 'levelFail', 'hintUsed', 'restart'] },
}

describe('intersticial · las cuatro excepciones vinculantes', () => {
  const ctx = { unit: 2, failed: false, atCutscene: false }

  it('se muestra al alcanzar el contador', () => {
    expect(shouldShowInterstitial(manifest, { levelsSinceAd: 5 }, ctx).show).toBe(true)
  })

  it('1 · nunca tras un fallo', () => {
    const d = shouldShowInterstitial(manifest, { levelsSinceAd: 9 }, { ...ctx, failed: true })
    expect(d.show).toBe(false)
    expect(d.reason).toContain('fallo')
  })

  it('2 · nunca durante la primera unidad', () => {
    const d = shouldShowInterstitial(manifest, { levelsSinceAd: 9 }, { ...ctx, unit: 1 })
    expect(d.show).toBe(false)
    expect(d.reason).toContain('unidad 1')
  })

  it('3 · nunca entre viñetas narrativas', () => {
    const d = shouldShowInterstitial(manifest, { levelsSinceAd: 9 }, { ...ctx, atCutscene: true })
    expect(d.show).toBe(false)
    expect(d.reason).toContain('viñetas')
  })

  it('4 · un anuncio con recompensa reinicia el contador', () => {
    expect(afterRewarded(manifest, { levelsSinceAd: 4 }).levelsSinceAd).toBe(0)
  })

  it('el contador avanza por nivel y se reinicia al mostrar', () => {
    let c = { levelsSinceAd: 0 }
    for (let i = 0; i < 5; i++) c = afterLevelCompleted(c)
    expect(shouldShowInterstitial(manifest, c, ctx).show).toBe(true)
    expect(afterInterstitial().levelsSinceAd).toBe(0)
  })
})

describe('progreso persistido', () => {
  it('un progreso desconocido no borra nada: se conserva lo que se entienda', () => {
    const p = migrate({ levels: { a: { stars: 2, perfect: false, bestScore: 9, completedAt: 1 } }, xp: 40 })
    expect(p.version).toBe(1)
    expect(p.xp).toBe(40)
    expect(totalStars(p)).toBe(2)
  })

  it('un progreso vacío o corrupto arranca limpio en vez de reventar', () => {
    expect(migrate(null).levels).toEqual({})
    expect(migrate('nada').levels).toEqual({})
  })

  it('las marcas nunca empeoran al repetir un nivel', () => {
    let p = recordLevel(EMPTY_PROGRESS, 'l1', { stars: 3, perfect: true, bestScore: 8, completedAt: 1 }, true)
    p = recordLevel(p, 'l1', { stars: 1, perfect: false, bestScore: 20, completedAt: 2 }, true)
    expect(p.levels['l1']?.stars).toBe(3)
    expect(p.levels['l1']?.perfect).toBe(true)
    expect(p.levels['l1']?.bestScore).toBe(8)
  })

  it('en un arcade, mejor es más', () => {
    let p = recordLevel(EMPTY_PROGRESS, 'l1', { stars: 1, perfect: false, bestScore: 100, completedAt: 1 }, false)
    p = recordLevel(p, 'l1', { stars: 2, perfect: false, bestScore: 300, completedAt: 2 }, false)
    expect(p.levels['l1']?.bestScore).toBe(300)
  })

  it('desbloqueo por nivel anterior completado', () => {
    const ids = ['a', 'b', 'c']
    const p = recordLevel(EMPTY_PROGRESS, 'a', { stars: 1, perfect: false, bestScore: 5, completedAt: 1 }, true)
    expect(isUnlocked(p, ids, 'a', 'previousComplete', 0)).toBe(true)
    expect(isUnlocked(p, ids, 'b', 'previousComplete', 0)).toBe(true)
    expect(isUnlocked(p, ids, 'c', 'previousComplete', 0)).toBe(false)
  })
})

describe('telemetría', () => {
  it('sin consentimiento no encola nada', () => {
    const q = new TelemetryQueue(manifest, () => 0)
    expect(q.record('levelComplete')).toBe(false)
    expect(q.size).toBe(0)
  })

  it('solo registra eventos declarados en el manifiesto', () => {
    const q = new TelemetryQueue(manifest, () => 0)
    q.setConsent(true)
    expect(q.record('levelComplete')).toBe(true)
    expect(q.record('inventado')).toBe(false)
    expect(q.size).toBe(1)
  })

  it('retirar el consentimiento vacía lo acumulado', () => {
    const q = new TelemetryQueue(manifest, () => 0)
    q.setConsent(true)
    q.record('levelComplete')
    q.setConsent(false)
    expect(q.size).toBe(0)
  })
})

// ── el «juego» de prueba: subir un contador hasta 3 ──────────────────────────

type Input = 'up' | 'boom'
interface Level { readonly target: number }
interface State { readonly n: number }

const toy: DeterministicGame<Level, State, Input, null> = {
  id: 'toy',
  capabilities: { deterministic: true, solvable: true, timed: false },
  parseLevel: (r) => r as Level,
  levelMeta: (l) => ({ id: 'toy-1', title: 'juguete', unit: 1, par: l.target, hintText: 'sube' }),
  initialState: () => ({ n: 0 }),
  inputs: () => ['up', 'boom'],
  hashState: (s) => String(s.n),
  isVictory: (l, s) => s.n >= l.target,
  step: (level, state, input) =>
    input === 'boom'
      ? { kind: 'failed' }
      : { kind: 'moved', state: { n: state.n + 1 }, counted: true, won: state.n + 1 >= level.target },
}

describe('controlador de partida', () => {
  const level: Level = { target: 3 }
  const clock = (): { now: () => number; advance: (ms: number) => void } => {
    let t = 1000
    return { now: () => t, advance: (ms) => { t += ms } }
  }

  it('el reloj arranca con el primer input, no al montar (S-20)', () => {
    const c = clock()
    const ctl = new LevelController(toy, level, { manifest, now: c.now })
    c.advance(5000)
    expect(ctl.view.elapsedMs).toBe(0)
    ctl.play('up')
    c.advance(2000)
    expect(ctl.view.elapsedMs).toBe(2000)
  })

  it('el reloj se detiene al ganar', () => {
    const c = clock()
    const ctl = new LevelController(toy, level, { manifest, now: c.now })
    ctl.play('up'); c.advance(100)
    ctl.play('up'); c.advance(100)
    ctl.play('up')
    const at = ctl.view.elapsedMs
    c.advance(10_000)
    expect(ctl.view.elapsedMs).toBe(at)
  })

  it('tres estrellas y PERFECTO con la solución óptima y sin pistas', () => {
    const ctl = new LevelController(toy, level, { manifest, now: () => 0 })
    ctl.play('up'); ctl.play('up'); ctl.play('up')
    const o = ctl.outcome()
    expect(o.stars).toBe(3)
    expect(o.perfect).toBe(true)
    expect(o.xp).toBe(3 * 10 + 25)
  })

  it('usar una pista quita el PERFECTO pero no las estrellas', () => {
    const ctl = new LevelController(toy, level, { manifest, now: () => 0 })
    ctl.hint()
    ctl.play('up'); ctl.play('up'); ctl.play('up')
    const o = ctl.outcome()
    expect(o.stars).toBe(3)
    expect(o.perfect).toBe(false)
  })

  it('el peldaño de pista avanza y a partir del tercero cuesta anuncio', () => {
    const ctl = new LevelController(toy, level, { manifest, now: () => 0 })
    expect(ctl.view.nextHintRung).toBe(1)
    expect(ctl.view.hintCostsAd).toBe(false)
    ctl.hint()
    ctl.hint()
    expect(ctl.view.nextHintRung).toBe(3)
    expect(ctl.view.hintCostsAd).toBe(true) // freeRungs: 2
  })

  it('la pista se recalcula desde donde está el jugador', () => {
    const ctl = new LevelController(toy, level, { manifest, now: () => 0 })
    ctl.play('up')
    ctl.hint() // peldaño 1: concepto
    const h = ctl.hint() // peldaño 2: siguiente movimiento
    expect(h.kind).toBe('moves')
    const h5 = new LevelController(toy, level, { manifest, now: () => 0 })
    h5.play('up')
    for (let i = 0; i < 4; i++) h5.hint()
    const last = h5.hint()
    // Quedan 2 movimientos desde aquí; el quinto peldaño da todos menos el último.
    if (last.kind === 'moves') expect(last.moves).toHaveLength(1)
  })

  it('la telemetría registra el fallo y la victoria', () => {
    const q = new TelemetryQueue(manifest, () => 0)
    q.setConsent(true)
    const ctl = new LevelController(toy, level, { manifest, now: () => 0, telemetry: q })
    ctl.play('boom')
    ctl.play('up'); ctl.play('up'); ctl.play('up')
    const names = q.drain().map((e) => e.name)
    expect(names).toContain('levelFail')
    expect(names).toContain('levelComplete')
  })

  it('previsualizar no toca la partida', () => {
    const ctl = new LevelController(toy, level, { manifest, now: () => 0 })
    ctl.preview('up', 'full')
    ctl.preview('boom', 'danger')
    expect(ctl.view.moves).toBe(0)
  })
})
