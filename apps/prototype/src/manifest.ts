/**
 * El manifiesto de Shadow Logic.
 *
 * Toda la configuración de la app cabe aquí: umbrales de estrellas, escalera de
 * pistas, política de anuncios, pantallas activas, ajustes. Cambiar de juego o
 * de marca es cambiar este fichero y el tema — el código de la carcasa no se
 * toca.
 *
 * Los valores no son inventados: salen del Rulebook v2.7 §8, §10 y §13-BIS.
 */

import type { Manifest } from '@game/core'

export const SHADOW_LOGIC_MANIFEST: Manifest = {
  app: {
    id: 'shadow-logic',
    name: 'Shadow Logic',
    bundleId: 'com.estudio.shadowlogic',
    locales: ['es'],
    orientation: 'portrait',
  },

  content: {
    game: 'shadow-logic',
    unitLabel: { one: 'caso', many: 'casos' },
    units: [{ id: 1, title: '¿Quién se ha llevado el pastel?', levels: 8 }],
    unlock: { rule: 'previousComplete', starsRequired: 0 },
  },

  progression: {
    scoreDirection: 'lower-is-better',
    stars: [
      { n: 3, when: 'score <= par' },
      { n: 2, when: 'score <= par * 1.3' },
      { n: 1, when: 'completed' },
    ],
    perfect: { parExact: true, noHints: true },
    xp: { perStar: 10, perPerfect: 25 },
    // S-20: se mide y se muestra, guarda récord, pero no puntúa.
    timer: { track: true, scores: false },
  },

  hints: {
    ladder: ['concept', 'nextMove', 'nextMove', 'nextMove', 'solutionMinusLast'],
    // S-16: gratis e ilimitadas DURANTE EL MVP. El muro llega en el lanzamiento.
    gate: { freeRungs: 5 },
    recomputeFromCurrentState: true,
  },

  monetization: {
    interstitial: {
      everyNLevels: 5,
      skipWhen: ['afterFailure', 'duringUnit:1', 'betweenCutscenes', 'afterRewarded'],
    },
    rewarded: { unlocks: ['hintRung:3', 'hintRung:4', 'hintRung:5'] },
    currency: { soft: true, hard: false, buys: ['cosmetics'] },
    iap: ['removeAds', 'cosmeticPack'],
  },

  screens: {
    enabled: ['splash', 'menu', 'map', 'levelSelect', 'game', 'pause', 'levelComplete', 'settings'],
    disabled: ['dailyPuzzle', 'shop', 'customization', 'profile', 'unitComplete'],
  },

  settings: {
    preview: { modes: ['full', 'danger', 'none'], default: 'full' },
    haptics: true,
    sound: true,
    music: true,
  },

  telemetry: {
    events: ['levelStart', 'levelComplete', 'levelFail', 'hintUsed', 'previewModeChanged', 'restart', 'undo'],
  },
}
