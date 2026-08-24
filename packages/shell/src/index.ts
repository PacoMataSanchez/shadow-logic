/**
 * @game/shell — la carcasa.
 *
 * Depende de @game/core y @puzzle/kit. **No conoce ningún juego.**
 * Si algún día necesitara importar de `games/`, sería que el contrato falla.
 */
export {
  shouldShowInterstitial, afterInterstitial, afterRewarded, afterLevelCompleted,
  type AdCounter, type InterstitialContext, type InterstitialDecision,
} from './commerce/interstitial.js'
export {
  migrate, recordLevel, totalStars, isUnlocked, MemoryStorage,
  EMPTY_PROGRESS, PROGRESS_VERSION,
  type Progress, type LevelRecord, type StorageAdapter,
} from './storage/progress.js'
export { TelemetryQueue, type TelemetryEvent } from './telemetry/queue.js'
export { LevelController, type GameView, type ControllerDeps } from './session/controller.js'
export { NOIR } from './theme/noir.js'
