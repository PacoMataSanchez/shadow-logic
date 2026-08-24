/**
 * El catálogo: equivalencia motor–solver, las seis validaciones y las
 * invariantes de QA sobre todos los estados alcanzables.
 *
 * La equivalencia es el test más importante del proyecto (Arquitectura §9):
 * reproducir `solutionPath` debe ganar en exactamente `optimalMoves`. Es el que
 * detecta que motor y solver han dejado de decir lo mismo.
 */

import { describe, expect, it } from 'vitest'

import { currentRulesHash, replay, solve, validate } from '@puzzle/authoring'
import { findPath } from '@puzzle/kit'

import { shadowLogic } from '../src/adapter.js'
import * as SL from '../src/engine/index.js'
import { LEVELS } from '../src/levels/loader.js'
import { SHADOW_LOGIC_CHECKS } from '../tools/checks.js'
import { SHADOW_LOGIC_RULES } from '../tools/rules.js'

describe('equivalencia motor–solver', () => {
  for (const level of LEVELS) {
    it(`${level.id} · ${level.title}`, () => {
      const r = replay(shadowLogic, level, (level.solutionPath ?? []) as SL.Direccion[])
      expect(r.error).toBeUndefined()
      expect(r.won).toBe(true)
      expect(r.moves).toBe(level.optimalMoves)
    })
  }
})

describe('las seis validaciones del Rulebook §11', () => {
  for (const level of LEVELS) {
    it(`${level.id}`, () => {
      const report = validate(shadowLogic, level, SHADOW_LOGIC_CHECKS)
      for (const c of report.checks) expect(c.ok, `V${c.n} ${c.name}: ${c.detail}`).toBe(true)
      expect(report.optimalMoves).toBe(level.optimalMoves)
      expect(report.solutionCount).toBe(level.solutionCount)
    })
  }
})

describe('invariantes de QA sobre todos los estados alcanzables', () => {
  for (const level of LEVELS) {
    it(`${level.id}`, () => {
      const cl = SL.compile(level)
      const res = solve(shadowLogic, level)
      expect(res.solvable).toBe(true)

      for (const node of res.graph.values()) {
        const e = node.state
        const doorsOpen = SL.freezeDoors(cl, e)

        const detT = SL.terrainAt(cl, e.det)
        expect(detT, 'el detective nunca ocupa una pared').not.toBe(SL.TERRENO.PARED)
        if (detT === SL.TERRENO.PUERTA) expect(doorsOpen.has(SL.key(e.det))).toBe(true)
        if (detT === SL.TERRENO.AGUJERO) expect(e.filled.has(SL.key(e.det))).toBe(true)

        if (e.sha !== null) {
          expect(SL.terrainAt(cl, e.sha)).not.toBe(SL.TERRENO.PARED)
          if (!e.shaAbsent) expect(SL.key(e.sha)).not.toBe(SL.key(e.det))
        }
      }
    })
  }
})

describe('irreversibilidades', () => {
  for (const level of LEVELS) {
    it(`${level.id} · un agujero tapado nunca se destapa, una sombra hundida nunca vuelve`, () => {
      const res = solve(shadowLogic, level)
      for (const node of res.graph.values()) {
        const e = node.state
        for (const nk of node.out.values()) {
          const child = res.graph.get(nk)?.state
          if (!child) continue
          for (const filled of e.filled) expect(child.filled.has(filled)).toBe(true)
          if (e.sha === null) expect(child.sha).toBeNull()
        }
      }
    })
  }
})

describe('estado del catálogo', () => {
  it('ningún nivel tiene el rulesHash desfasado', () => {
    const actual = currentRulesHash(SHADOW_LOGIC_RULES)
    for (const l of LEVELS) expect(l.rulesHash, `${l.id} pendiente de revalidar`).toBe(actual)
  })

  it('todo nivel del Caso 01 tiene solución óptima única', () => {
    for (const l of LEVELS.filter((x) => x.case === 1)) expect(l.solutionCount).toBe(1)
  })

  it('la curva de dificultad no baja al llegar al Master', () => {
    const caso1 = LEVELS.filter((l) => l.case === 1)
    const master = caso1[caso1.length - 1]
    const resto = caso1.slice(0, -1)
    expect(master?.optimalMoves).toBeGreaterThanOrEqual(
      Math.max(...resto.map((l) => l.optimalMoves ?? 0)),
    )
  })
})

describe('los dos BFS coinciden', () => {
  // `findPath` (runtime, corta al ganar) y `solve` (autoría, exhaustivo) recorren
  // el árbol por separado. No duplican reglas —ambos llaman a `step`— pero sí el
  // recorrido, y esta prueba es lo que hace segura esa duplicación.
  for (const level of LEVELS) {
    it(`${level.id}`, () => {
      const runtime = findPath(shadowLogic, level, shadowLogic.initialState(level))
      expect(runtime).not.toBeNull()
      expect(runtime?.length).toBe(level.optimalMoves)
    })
  }
})
