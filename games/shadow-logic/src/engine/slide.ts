/**
 * El deslizamiento canónico — S-01 y S-02.
 *
 * > No eliges dónde parar. Eliges contra qué chocar.
 *
 * Detective y sombra comparten esta física. Lo único que cambia entre ambos es
 * la tabla de colisiones (collisions.ts) y lo que recogen o accionan por el camino.
 */

import { terrainAt } from './compile.js'
import { type FrozenWorld, detectiveOutcome, shadowOutcome } from './collisions.js'
import { switchGroupAt } from './light.js'
import { DELTA, type Direccion, type Pos, type PosKey, TERRENO, key } from './types.js'

export interface DetectiveSlide {
  /** Casillas recorridas, incluida la de partida. */
  readonly path: readonly Pos[]
  readonly end: Pos
  /** Terminó cayendo en un agujero sin tapar (S-09). `end` es la casilla del agujero. */
  readonly fell: boolean
  /** Se detuvo por alcanzar a la sombra: hay empujón (S-03). */
  readonly push: boolean
  /** Pistas recogidas durante el recorrido (S-08). */
  readonly picked: readonly PosKey[]
  /** Grupos de luz conmutados al pisar interruptores (S-18). */
  readonly switchHits: readonly number[]
}

export function slideDetective(
  w: FrozenWorld,
  from: Pos,
  dir: Direccion,
  got: ReadonlySet<PosKey>,
): DetectiveSlide {
  const [dr, dc] = DELTA[dir]
  const path: Pos[] = [from]
  const picked: PosKey[] = []
  const switchHits: number[] = []

  let cur: Pos = from

  for (;;) {
    const next: Pos = [cur[0] + dr, cur[1] + dc]
    const outcome = detectiveOutcome(w, next)

    if (outcome === 'stop') {
      return { path, end: cur, fell: false, push: false, picked, switchHits }
    }
    if (outcome === 'push') {
      return { path, end: cur, fell: false, push: true, picked, switchHits }
    }
    if (outcome === 'fall') {
      path.push(next)
      return { path, end: next, fell: true, push: false, picked, switchHits }
    }

    // enter
    cur = next
    path.push(cur)

    const k = key(cur)
    const t = terrainAt(w.cl, cur)
    if (t === TERRENO.PISTA && !got.has(k) && !picked.includes(k)) picked.push(k)

    const g = switchGroupAt(w.cl, cur)
    if (g !== undefined) switchHits.push(g)
  }
}

export interface ShadowSlide {
  readonly path: readonly Pos[]
  /** `null` = cayó en un agujero y queda fuera de juego (S-05). */
  readonly end: Pos | null
  /** Casilla del agujero tapado, si lo hubo. */
  readonly sunk?: Pos
  /** ¿Se desplazó realmente? S-04: puede no poder moverse. */
  readonly moved: boolean
}

export function slideShadow(w: FrozenWorld, from: Pos, dir: Direccion): ShadowSlide {
  const [dr, dc] = DELTA[dir]
  const path: Pos[] = [from]
  let cur: Pos = from

  for (;;) {
    const next: Pos = [cur[0] + dr, cur[1] + dc]
    const outcome = shadowOutcome(w, next)

    if (outcome === 'stop') {
      // S-04: si no puede desplazarse, no se mueve. El detective se para igual.
      return { path, end: cur, moved: path.length > 1 }
    }
    if (outcome === 'sink') {
      path.push(next)
      return { path, end: null, sunk: next, moved: true }
    }

    cur = next
    path.push(cur)
  }
}
