/**
 * El anuncio intersticial y sus cuatro excepciones VINCULANTES.
 *
 * Rulebook §13-BIS. No son recomendaciones: cada una tapa un momento concreto de
 * abandono, y por eso viven en código con nombre propio y prueba propia en vez
 * de en la cabeza de quien implemente la pantalla de resultado.
 *
 *   1. Nunca tras un fallo. Caer ya reinicia el nivel; un anuncio encima es el
 *      momento de mayor abandono del juego.
 *   2. Nunca durante la primera unidad. Un anuncio antes de haber convencido al
 *      jugador es alcance perdido.
 *   3. Nunca entre viñetas narrativas. Cortar el cierre de un caso destruye la
 *      única recompensa emocional del mundo.
 *   4. Un anuncio con recompensa reinicia el contador. Quien acaba de ver uno
 *      voluntariamente no recibe otro dos niveles después.
 */

import type { Manifest } from '@game/core'

export interface AdCounter {
  /** Niveles completados desde el último anuncio de cualquier tipo. */
  readonly levelsSinceAd: number
}

export interface InterstitialContext {
  /** Unidad del nivel recién terminado. */
  readonly unit: number
  /** ¿El intento acabó en fallo? */
  readonly failed: boolean
  /** ¿Toca viñeta narrativa justo ahora? */
  readonly atCutscene: boolean
}

export type InterstitialDecision =
  | { show: false; reason: string }
  | { show: true; reason: 'contador alcanzado' }

export function shouldShowInterstitial(
  manifest: Manifest,
  counter: AdCounter,
  ctx: InterstitialContext,
): InterstitialDecision {
  const cfg = manifest.monetization.interstitial
  const skip = new Set(cfg.skipWhen)

  if (ctx.failed && skip.has('afterFailure')) {
    return { show: false, reason: 'nunca tras un fallo' }
  }
  if (skip.has(`duringUnit:${ctx.unit}`)) {
    return { show: false, reason: `nunca durante la unidad ${ctx.unit}` }
  }
  if (ctx.atCutscene && skip.has('betweenCutscenes')) {
    return { show: false, reason: 'nunca entre viñetas narrativas' }
  }
  if (counter.levelsSinceAd < cfg.everyNLevels) {
    return { show: false, reason: `faltan ${cfg.everyNLevels - counter.levelsSinceAd} niveles` }
  }
  return { show: true, reason: 'contador alcanzado' }
}

/** Tras mostrar un intersticial. */
export function afterInterstitial(): AdCounter {
  return { levelsSinceAd: 0 }
}

/**
 * Excepción 4: un anuncio con recompensa —que el jugador ha pedido— también
 * reinicia el contador del intersticial.
 */
export function afterRewarded(manifest: Manifest, counter: AdCounter): AdCounter {
  return manifest.monetization.interstitial.skipWhen.includes('afterRewarded')
    ? { levelsSinceAd: 0 }
    : counter
}

export function afterLevelCompleted(counter: AdCounter): AdCounter {
  return { levelsSinceAd: counter.levelsSinceAd + 1 }
}
