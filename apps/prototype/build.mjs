/**
 * Empaqueta el prototipo en un solo HTML autocontenido.
 *
 * El motor real viaja dentro: no hay una segunda implementación de las reglas
 * para la web. Lo que se juega en el navegador es exactamente lo que valida el
 * solver y lo que verifica el `rulesHash`.
 */

import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const out = resolve(here, 'dist')

const alias = {
  '@game/core': resolve(root, 'packages/core/src/index.ts'),
  '@game/shell': resolve(root, 'packages/shell/src/index.ts'),
  '@puzzle/kit': resolve(root, 'packages/puzzle-kit/src/index.ts'),
  '@puzzle/authoring': resolve(root, 'packages/authoring/src/index.ts'),
  '@game/shadow-logic': resolve(root, 'games/shadow-logic/src/index.ts'),
}

const result = await build({
  entryPoints: [resolve(here, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  write: false,
  loader: { '.json': 'json' },
  alias,
  legalComments: 'none',
})

const js = result.outputFiles[0].text
const html = readFileSync(resolve(here, 'index.template.html'), 'utf8').replace('/*__BUNDLE__*/', () => js)

mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'shadow-logic.html'), html)

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log(`bundle  ${kb(js.length)}`)
console.log(`html    ${kb(html.length)}  →  apps/prototype/dist/shadow-logic.html`)
