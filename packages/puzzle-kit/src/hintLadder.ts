/**
 * S-15 — la escalera de pistas.
 *
 * Cinco peldaños, cada uno accesible solo tras el anterior:
 *
 *   1  pista conceptual escrita a mano, en la voz del juego
 *   2  dirección del próximo movimiento óptimo
 *   3  siguiente movimiento
 *   4  siguiente movimiento
 *   5  la solución completa MENOS el último paso
 *
 * La quinta no da la solución entera a propósito: lleva al jugador hasta el
 * borde y le deja cerrar el nivel con sus manos. Nadie queda atascado sin
 * salida, y nadie siente que el juego se ha jugado solo.
 *
 * «El último paso» es el último MOVIMIENTO, no la última pista por recoger.
 */

import type { HintRung } from '@game/core'

export interface HintRequest<I> {
  /** Ruta óptima desde el estado ACTUAL del jugador, no desde el inicio. */
  readonly pathFromHere: readonly I[]
  readonly hintText?: string
  readonly ladder: readonly HintRung[]
  /** Peldaño solicitado, base 1. */
  readonly rung: number
}

export type Hint<I> =
  | { kind: 'concept'; text: string }
  | { kind: 'moves'; moves: readonly I[]; label: 'next' | 'almostAll' }
  | { kind: 'unavailable'; reason: string }

export function resolveHint<I>(req: HintRequest<I>): Hint<I> {
  const rung = req.ladder[req.rung - 1]
  if (rung === undefined) return { kind: 'unavailable', reason: 'peldaño fuera de la escalera' }

  switch (rung) {
    case 'concept':
      return req.hintText
        ? { kind: 'concept', text: req.hintText }
        : { kind: 'unavailable', reason: 'este nivel no tiene pista escrita' }

    case 'nextMove': {
      // Cuántos movimientos ya se han revelado por peldaños anteriores del mismo tipo.
      const revealed = req.ladder.slice(0, req.rung - 1).filter((r) => r === 'nextMove').length
      const move = req.pathFromHere[revealed]
      return move === undefined
        ? { kind: 'unavailable', reason: 'ya no quedan movimientos que revelar' }
        : { kind: 'moves', moves: [move], label: 'next' }
    }

    case 'solutionMinusLast': {
      if (req.pathFromHere.length === 0) {
        return { kind: 'unavailable', reason: 'no hay ruta desde aquí' }
      }
      return { kind: 'moves', moves: req.pathFromHere.slice(0, -1), label: 'almostAll' }
    }

    case 'solution':
      return { kind: 'moves', moves: req.pathFromHere, label: 'almostAll' }
  }
}

/** ¿Está desbloqueado este peldaño sin pagar? S-16. */
export function isFreeRung(rung: number, freeRungs: number): boolean {
  return rung <= freeRungs
}
