/**
 * Qué ficheros del motor cuentan como REGLAS para el `rulesHash`.
 *
 * `compile.ts` y `hashState.ts` no entran: son plomería, no deciden nada.
 * Si esta lista cambia, todos los niveles quedan marcados como pendientes — y
 * eso es lo correcto, porque significa que las reglas se han redefinido.
 */

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { RulesHashSpec } from '@puzzle/authoring'

import { RULES_TAG } from '../src/engine/index.js'

export const GAME_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const SHADOW_LOGIC_RULES: RulesHashSpec = {
  root: GAME_ROOT,
  files: [
    'src/engine/types.ts',
    'src/engine/collisions.ts',
    'src/engine/slide.ts',
    'src/engine/world.ts',
    'src/engine/light.ts',
    'src/engine/victory.ts',
    'src/engine/step.ts',
  ],
  tag: RULES_TAG,
}
