/**
 * Huella de las reglas del motor, leyendo sus ficheros fuente.
 *
 * Vive en autoría porque lee del disco: `@game/core` aporta la función pura de
 * hash y un motor nunca puede depender de `node:fs` si tiene que ejecutarse tal
 * cual dentro de React Native.
 *
 * Si el `rulesHash` de un nivel no coincide con el del motor actual, el nivel
 * queda marcado como pendiente de revalidar y `batch` lo reprocesa.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { hashRules } from '@game/core'

export interface RulesHashSpec {
  /** Raíz desde la que se resuelven las rutas. */
  readonly root: string
  /** Ficheros que codifican REGLAS. La plomería (índices, compilación) no entra. */
  readonly files: readonly string[]
  /** Etiqueta semántica del cuerpo de reglas, p. ej. `rulebook-2.7`. */
  readonly tag: string
}

const cache = new Map<string, string>()

export function currentRulesHash(spec: RulesHashSpec): string {
  const key = `${spec.tag}@${spec.root}`
  const hit = cache.get(key)
  if (hit) return hit
  const sources = spec.files.map((f) => readFileSync(resolve(spec.root, f), 'utf8'))
  const value = `${spec.tag}:${hashRules(sources)}`
  cache.set(key, value)
  return value
}

export function isStale(spec: RulesHashSpec, levelHash: string | undefined): boolean {
  return levelHash !== currentRulesHash(spec)
}
