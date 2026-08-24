/**
 * SHADOW LOGIC — motor.
 *
 * > La lógica del puzzle no sabe que existe React.
 *
 * Prohibiciones duras (Arquitectura §3): este directorio no importa de
 * `render/`, `ui/`, `storage/` ni de React, y no usa `Date.now()`,
 * `Math.random()` ni ninguna API asíncrona.
 */

export * from './types.js'
export { compile, terrainAt, inBounds, type CompiledLevel } from './compile.js'
export { step, initialState, restart, restartAfterFall } from './step.js'
export { slideDetective, slideShadow } from './slide.js'
export { detectiveOutcome, shadowOutcome, type FrozenWorld } from './collisions.js'
export { freezeDoors, plateActive } from './world.js'
export { isDark, applySwitches, resolveShadowPresence, shadowBlocks } from './light.js'
export { isVictory, allCluesCollected } from './victory.js'
export { hashState } from './hashState.js'

/**
 * Etiqueta semántica del cuerpo de reglas implementado. Se sube a mano cuando el
 * Rulebook cambia de versión; la huella de ficheros (que calcula `tools/`)
 * detecta las derivas que un humano olvidaría anotar.
 */
export const RULES_TAG = 'rulebook-2.7'
