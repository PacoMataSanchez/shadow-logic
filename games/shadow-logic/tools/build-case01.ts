/**
 * Genera y escribe los 8 niveles del Caso 01.
 *
 *   npm run generate -- --seed 20260820 --tries 40000
 *
 * Determinista: misma semilla, mismos niveles.
 *
 * Todo el bucle de búsqueda es de `@puzzle/authoring`. Este fichero solo aporta
 * lo del juego: los moldes, cuántas pistas, qué zonas y qué mecánicas exigir.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { commonCriteria, currentRulesHash, search, type Rng } from '@puzzle/authoring'

import { shadowLogic } from '../src/adapter.js'
import type { Direccion, Level } from '../src/engine/index.js'
import { analyzePath } from './analyze.js'
import { SHADOW_LOGIC_CHECKS } from './checks.js'
import type { GenSpec } from './mold.js'
import { ALMACEN, ARCHIVO, AZOTEA, COCINA, DESPACHO, PATIO, RECIBIDOR, SOTANO } from './molds/case01.js'
import { proposeLevel } from './propose.js'
import { GAME_ROOT, SHADOW_LOGIC_RULES } from './rules.js'

const OUT = resolve(GAME_ROOT, 'src/levels/case01')

export const CASO_01: readonly GenSpec[] = [
  {
    mold: DESPACHO, levelId: 'c1-001', title: 'Primer día',
    clues: 1, minMoves: 4, maxMoves: 6, tutorial: true,
    hintText: 'No frenas cuando quieres, frenas cuando chocas. Asúmelo y vamos.',
  },
  {
    mold: DESPACHO, levelId: 'c1-002', title: 'Estoy aquí',
    clues: 2, minMoves: 6, maxMoves: 8, tutorial: true,
    hintText: 'Yo también paro las cosas. Sobre todo a ti. Úsame de pared.',
  },
  {
    mold: ARCHIVO, levelId: 'c1-003', title: 'Perdona',
    clues: 2, minMoves: 8, maxMoves: 12, require: { push: true },
    hintText: 'Si vienes hacia mí me empujas. Enhorabuena, ya sabes moverme.',
  },
  {
    mold: RECIBIDOR, levelId: 'c1-004', title: 'Colócame',
    clues: 3, minMoves: 9, maxMoves: 13, require: { push: true },
    hintText: 'Piensa dónde me quieres ANTES de empujarme. Luego no te quejes.',
  },
  {
    mold: ALMACEN, levelId: 'c1-005', title: 'La puerta',
    clues: 2, plates: 1, minMoves: 7, maxMoves: 12, require: { push: true },
    placement: { plates: 'A', exit: 'B', player: 'A', shadow: 'A', clues: 'AB' },
    hintText: 'Yo peso, tú no. La placa es cosa mía. Déjame encima y no me toques más.',
  },
  {
    mold: PATIO, levelId: 'c1-006', title: 'El tendedero',
    clues: 3, plates: 1, minMoves: 10, maxMoves: 16, require: { push: true },
    placement: { plates: 'A', exit: 'B', player: 'A', shadow: 'A', clues: 'AB' },
    hintText: 'Primero abre, después recoge. Al revés te toca volver, y vuelvo yo contigo.',
  },
  {
    mold: SOTANO, levelId: 'c1-007', title: 'El puente',
    clues: 2, holes: 2, minMoves: 11, maxMoves: 16, require: { bridge: true },
    hintText: 'Sí, puedo taparte el agujero. Una vez. Y ya no vuelvo. Piénsalo bien.',
  },
  {
    mold: AZOTEA, levelId: 'c1-008', title: 'Caso cerrado',
    clues: 4, holes: 2, minMoves: 15, maxMoves: 25,
    require: { push: true, bridge: true },
    hintText:
      'Cuatro pistas y una sola yo. Primero úsame de pared todo lo que puedas; ' +
      'hundirme es lo último que harás conmigo.',
  },
]

void COCINA // molde de reserva: aún sin receta

function main(): void {
  const args = process.argv.slice(2)
  const seed = Number(argOf(args, '--seed') ?? 20260820)
  const tries = Number(argOf(args, '--tries') ?? 40000)
  const hash = currentRulesHash(SHADOW_LOGIC_RULES)

  mkdirSync(OUT, { recursive: true })
  const built: Level[] = []
  let failed = 0

  for (const [i, spec] of CASO_01.entries()) {
    const res = search(
      shadowLogic,
      {
        propose: (rng: Rng) => proposeLevel(spec, rng),
        checks: SHADOW_LOGIC_CHECKS,
        criteria: (level, report) => [
          ...commonCriteria(
            {
              ...(spec.minMoves !== undefined ? { minMoves: spec.minMoves } : {}),
              ...(spec.maxMoves !== undefined ? { maxMoves: spec.maxMoves } : {}),
              ...(spec.uniqueSolution !== undefined ? { uniqueSolution: spec.uniqueSolution } : {}),
              ...(spec.minStateRatio !== undefined ? { minStateRatio: spec.minStateRatio } : {}),
            },
            report,
          ),
          ...mechanicCriteria(spec, level, report.solutionPath as Direccion[] | null),
        ],
      },
      seed + i * 104729,
      tries,
    )

    if (!res.best) {
      failed++
      console.log(
        `✗ ${spec.levelId}  sin candidato tras ${res.stats.tried} intentos · ` +
          `${JSON.stringify({ ...res.stats.byCheck, ...res.stats.byCriterion })}`,
      )
      continue
    }

    const r = res.best.report
    const level: Level = {
      ...res.best.level,
      optimalMoves: r.optimalMoves ?? 0,
      solutionPath: (r.solutionPath ?? []) as Direccion[],
      solutionCount: r.solutionCount,
      rulesHash: hash,
    }
    built.push(level)
    writeFileSync(resolve(OUT, `${spec.levelId.slice(3)}.json`), JSON.stringify(level, null, 2) + '\n')

    console.log(
      `✓ ${level.id}  ${level.optimalMoves} mov · ${r.solutionCount} sol · ` +
        `${r.reachableStates} estados · ratio ${r.stateRatio?.toFixed(1)} · ` +
        `aceptación ${((res.stats.accepted / res.stats.tried) * 100).toFixed(1)}%`,
    )
  }

  writeFileSync(resolve(OUT, 'index.json'), JSON.stringify(built.map((l) => l.id), null, 2) + '\n')
  console.log(`\n${built.length}/${CASO_01.length} niveles escritos`)
  if (failed > 0) process.exitCode = 1
}

/** Criterios que dependen de qué mecánicas usa realmente la solución. */
function mechanicCriteria(
  spec: GenSpec,
  level: Level,
  path: readonly Direccion[] | null,
): string[] {
  const req = spec.require
  if (!req || !path) return []
  const a = analyzePath(level, path)
  const out: string[] = []
  if (req.push && !a.push) out.push('sin empujón')
  if (req.bridge && !a.bridge) out.push('sin puente')
  if (req.switch && !a.switchUsed) out.push('sin interruptor')
  if (req.vanish && !a.vanish) out.push('sin desaparición')
  return out
}

function argOf(args: readonly string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

if (process.argv[1]?.endsWith('build-case01.ts')) main()
