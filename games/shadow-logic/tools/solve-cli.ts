/**
 * Informe completo de un nivel.
 *
 *   npm run solve -- games/shadow-logic/src/levels/case01/008.json
 *   npm run solve -- games/shadow-logic/src/levels/case01/001.json --steps
 */

import { readFileSync } from 'node:fs'

import { validate } from '@puzzle/authoring'

import { shadowLogic } from '../src/adapter.js'
import type { Direccion } from '../src/engine/index.js'
import { parseLevel } from '../src/levels/schema.js'
import { analyzePath } from './analyze.js'
import { render, renderSolution } from './ascii.js'
import { SHADOW_LOGIC_CHECKS } from './checks.js'

const [, , file, ...flags] = process.argv
if (!file) {
  console.error('uso: npm run solve -- <fichero.json> [--steps]')
  process.exit(2)
}

const level = parseLevel(JSON.parse(readFileSync(file, 'utf8')))
const report = validate(shadowLogic, level, SHADOW_LOGIC_CHECKS)

console.log(`${level.id} — ${level.title}${level.place ? `  ·  ${level.place}` : ''}`)
console.log(render(level))
console.log()
for (const c of report.checks) console.log(` ${c.ok ? '✓' : '✗'} V${c.n} ${c.name}: ${c.detail}`)
console.log()
console.log(` óptimo        ${report.optimalMoves}`)
console.log(` soluciones    ${report.solutionCount}`)
console.log(` estados       ${report.reachableStates}`)
console.log(` estados/mov   ${report.stateRatio?.toFixed(1)}${report.corridorWarning ? '  ⚠ pasillo' : ''}`)

if (report.solutionPath) {
  const path = report.solutionPath as Direccion[]
  const a = analyzePath(level, path)
  console.log(` ruta          ${path.join(' ')}`)
  console.log(
    ` usa           ${
      [a.push && 'empujón', a.bridge && 'puente', a.switchUsed && 'interruptor', a.vanish && 'desaparición']
        .filter(Boolean)
        .join(', ') || '—'
    }`,
  )
  if (flags.includes('--steps')) {
    console.log()
    console.log(renderSolution(level, path))
  }
}
