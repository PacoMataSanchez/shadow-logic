/**
 * Revalidar el catálogo entero con el motor actual.
 *
 *   npm run batch
 *
 * El trabajo lo hace `runBatch` de `@puzzle/authoring`, que no sabe qué juego
 * está revalidando. Este fichero solo le dice cuál y dónde están las reglas.
 */

import { runBatch } from '@puzzle/authoring'

import { shadowLogic } from '../src/adapter.js'
import type { Direccion } from '../src/engine/index.js'
import { LEVELS } from '../src/levels/loader.js'
import { SHADOW_LOGIC_CHECKS } from './checks.js'
import { SHADOW_LOGIC_RULES } from './rules.js'

const report = runBatch({
  game: shadowLogic,
  levels: LEVELS,
  checks: SHADOW_LOGIC_CHECKS,
  rules: SHADOW_LOGIC_RULES,
  calculated: (l) => ({
    ...(l.optimalMoves !== undefined ? { optimalMoves: l.optimalMoves } : {}),
    ...(l.solutionPath !== undefined ? { solutionPath: l.solutionPath as readonly Direccion[] } : {}),
    ...(l.solutionCount !== undefined ? { solutionCount: l.solutionCount } : {}),
    ...(l.rulesHash !== undefined ? { rulesHash: l.rulesHash } : {}),
  }),
})

console.log(`rulesHash actual: ${report.rulesHash}`)
console.log(`${report.lines.length} niveles\n`)

for (const line of report.lines) {
  if (line.ok) {
    console.log(
      `✓ ${line.id}  ${line.optimalMoves} mov · ratio ${line.stateRatio?.toFixed(1)}` +
        (line.corridor ? '  ⚠ pasillo' : ''),
    )
  } else {
    console.log(`✗ ${line.id}`)
    for (const p of line.problems) console.log(`    ${p}`)
  }
}

const good = report.lines.filter((l) => l.ok).length
console.log(
  `\n${good}/${report.lines.length} niveles correctos` +
    (report.stale > 0 ? `, ${report.stale} desfasado(s)` : ''),
)
if (!report.ok) process.exitCode = 1
