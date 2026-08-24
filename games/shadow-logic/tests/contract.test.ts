/**
 * Pruebas de contrato, heredadas de `@puzzle/kit`.
 *
 * Un juego nuevo escribe estas cuatro líneas y arranca con la red puesta:
 * determinismo, pureza, estabilidad de la clave de estado, semántica del
 * contador y del deshacer. Ninguna de ellas sabe qué es una sombra.
 */

import { describeContract } from '@puzzle/kit'

import { shadowLogic } from '../src/adapter.js'
import type { Direccion } from '../src/engine/index.js'
import { LEVELS } from '../src/levels/loader.js'

const sequences = new Map<string, readonly Direccion[]>(
  LEVELS.map((l) => [l.id, (l.solutionPath ?? []) as readonly Direccion[]]),
)

describeContract('shadow-logic', shadowLogic, LEVELS, sequences)
