/**
 * El turno completo — Rulebook §3, los ocho pasos, en orden y sin atajos.
 *
 * `step()` es la ÚNICA puerta de entrada a la lógica. La usan idénticamente la
 * app, la previsualización (S-14) y el solver: la equivalencia de reglas se
 * cumple por construcción, no por disciplina.
 *
 * Función pura. Nunca muta el argumento (A-03): el BFS conserva miles de
 * estados y no puede permitirse aliasing.
 */

import { compile } from './compile.js'
import { type FrozenWorld } from './collisions.js'
import { applySwitches, resolveShadowPresence } from './light.js'
import { slideDetective, slideShadow } from './slide.js'
import {
  type Direccion,
  type Estado,
  type Level,
  type Pos,
  type PosKey,
  type Resultado,
  key,
} from './types.js'
import { isVictory } from './victory.js'
import { freezeDoors } from './world.js'

export function initialState(level: Level): Estado {
  const cl = compile(level)
  const lights = new Set(level.lightsOn ?? [])
  // Una sombra que empieza sobre casilla oscura empieza ausente (S-19).
  const presence = resolveShadowPresence(
    cl,
    level.shadowStart,
    false,
    level.playerStart,
    lights,
  )
  return {
    det: level.playerStart,
    sha: presence.sha,
    shaAbsent: presence.shaAbsent,
    got: new Set<PosKey>(),
    filled: new Set<PosKey>(),
    lights,
    moves: 0,
  }
}

/**
 * S-09 / S-11 — reinicio tras el tropiezo.
 *
 * El nivel vuelve al estado inicial pero el contador se conserva. El
 * deslizamiento fatal SÍ fue un desplazamiento, así que cuenta: por eso `+1`.
 * Es la misma penalización que hace que los reinicios ya no anulen PERFECTO.
 */
export function restartAfterFall(level: Level, estado: Estado): Estado {
  return { ...initialState(level), moves: estado.moves + 1 }
}

/** RESTART manual del jugador: el nivel empieza de cero, contador incluido (§40). */
export function restart(level: Level): Estado {
  return initialState(level)
}

export function step(level: Level, estado: Estado, dir: Direccion): Resultado {
  const cl = compile(level)

  // ── Paso 1 · recibir dirección  (el argumento `dir`)

  // ── Paso 2 · congelar puertas y luces según la posición ACTUAL de la sombra (S-06, S-18).
  //    Permanece fijo durante todo el turno. Esto es una REGLA, no una optimización:
  //    es lo que hace el turno determinista sin sub-pasos.
  const world: FrozenWorld = {
    cl,
    doorsOpen: freezeDoors(cl, estado),
    lights: estado.lights,
    filled: estado.filled,
    sha: estado.sha,
    shaAbsent: estado.shaAbsent,
  }

  // ── Paso 3 · deslizar al detective, resolviendo casilla a casilla.
  const det = slideDetective(world, estado.det, dir, estado.got)

  if (det.fell) {
    // S-09 · tropiezo. El estado no se toca: el nivel se reinicia fuera del motor.
    return { kind: 'fell', path: det.path }
  }

  // ── Paso 4 · si hubo empujón, deslizar la sombra (S-03, S-04, S-05).
  let sha = estado.sha
  let shaAbsent = estado.shaAbsent
  let shadowPath: readonly Pos[] | undefined
  let sunk: Pos | undefined
  let filled = estado.filled
  let shadowMoved = false

  if (det.push && estado.sha !== null) {
    const push = slideShadow(world, estado.sha, dir)
    shadowPath = push.path
    shadowMoved = push.moved
    if (push.sunk) {
      // S-05 · tapa el agujero y queda fuera de juego para el resto del nivel.
      const nextFilled = new Set(filled)
      nextFilled.add(key(push.sunk))
      filled = nextFilled
      sunk = push.sunk
      sha = null
      shaAbsent = false
    } else {
      sha = push.end
    }
  }

  const detMoved = det.path.length > 1

  // ── Paso 6 (adelantado para poder salir temprano) · S-01: sin desplazamiento, no hay turno.
  if (!detMoved && !shadowMoved) return { kind: 'nothing' }

  // ── Paso 5 · reevaluar el estado del mundo con las posiciones finales.
  const lights = applySwitches(estado.lights, det.switchHits) // S-18
  const presence = resolveShadowPresence(cl, sha, shaAbsent, det.end, lights) // S-19

  let got = estado.got
  if (det.picked.length > 0) {
    const nextGot = new Set(got)
    for (const k of det.picked) nextGot.add(k)
    got = nextGot
  }

  const next: Estado = {
    det: det.end,
    sha: presence.sha,
    shaAbsent: presence.shaAbsent,
    got,
    filled,
    lights,
    moves: estado.moves + 1, // paso 6
  }

  // ── Paso 7 · comprobar victoria (S-07).
  const won = isVictory(cl, next)

  // ── Paso 8 · renderizar. Fuera del motor: la animación nunca altera el estado.
  return {
    kind: 'moved',
    estado: next,
    path: det.path,
    won,
    ...(shadowPath ? { shadowPath } : {}),
    ...(sunk ? { sunk } : {}),
  }
}
