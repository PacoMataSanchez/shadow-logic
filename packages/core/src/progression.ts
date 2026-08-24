/**
 * Progresión — estrellas, PERFECTO, XP.
 *
 * Puro cálculo sobre el manifiesto y el resumen del intento. La carcasa no
 * necesita saber qué es una pista ni un movimiento: solo un `score`, un `par` y
 * la dirección en la que se puntúa.
 *
 * Rulebook §8: ⭐⭐⭐ si score ≤ par · ⭐⭐ si score ≤ par × 1.3 · ⭐ por completar.
 * Con `scoreDirection: 'higher-is-better'` las comparaciones se invierten, que es
 * lo que permite reutilizar esto en un arcade.
 */

import type { AttemptSummary } from './contract.js'
import type { Manifest, ScoreDirection } from './manifest.js'

export interface Outcome {
  readonly stars: 0 | 1 | 2 | 3
  readonly perfect: boolean
  readonly xp: number
}

export function evaluate(
  manifest: Manifest,
  par: number | undefined,
  summary: AttemptSummary,
  completed: boolean,
): Outcome {
  if (!completed) return { stars: 0, perfect: false, xp: 0 }

  const { scoreDirection, stars: rules, perfect: perfectRule, xp } = manifest.progression
  let stars: 0 | 1 | 2 | 3 = 1

  for (const rule of [...rules].sort((a, b) => b.n - a.n)) {
    if (satisfies(rule.when, summary.score, par, scoreDirection)) {
      stars = rule.n
      break
    }
  }

  const perfect =
    (!perfectRule.parExact || (par !== undefined && summary.score === par)) &&
    (!perfectRule.noHints || summary.usedHints === 0)

  return { stars, perfect, xp: stars * xp.perStar + (perfect ? xp.perPerfect : 0) }
}

/**
 * Evalúa un umbral del manifiesto. Deliberadamente limitado: `score` comparado
 * con `par` por un factor, o `completed`. Si algún día hace falta un `if` aquí,
 * la regla debe subir al código del juego, no crecer este intérprete (§5).
 */
function satisfies(
  when: string,
  score: number,
  par: number | undefined,
  dir: ScoreDirection,
): boolean {
  const expr = when.trim()
  if (expr === 'completed') return true
  if (par === undefined) return false

  const m = /^score\s*<=\s*par(?:\s*\*\s*([0-9.]+))?$/.exec(expr)
  if (!m) return false
  const factor = m[1] === undefined ? 1 : Number(m[1])
  const threshold = par * factor

  return dir === 'lower-is-better' ? score <= threshold : score >= par / factor
}

/** Estrellas acumuladas por unidad, para el mapa. */
export function unitStars(levelStars: readonly number[]): number {
  return levelStars.reduce((a, b) => a + b, 0)
}
