/**
 * Telemetría append-only.
 *
 * > Cada uso de pista se registra: nivel, tipo, movimiento en que se pidió,
 * > reinicios previos. **Es el dato más valioso del MVP.**
 *
 * Dos cosas que la carcasa impone y conviene no discutir después:
 *
 * - **Consentimiento por delante.** Sin consentimiento no se encola nada; no se
 *   encola y luego se descarta.
 * - **Sólo eventos declarados en el manifiesto.** Si un evento no está en la
 *   lista, no se registra. Evita que la telemetría crezca sola hasta convertirse
 *   en un vertedero que nadie lee.
 */

import type { Manifest } from '@game/core'

export interface TelemetryEvent {
  readonly name: string
  readonly at: number
  readonly props: Readonly<Record<string, string | number | boolean>>
}

export class TelemetryQueue {
  private readonly buffer: TelemetryEvent[] = []
  private consented = false

  constructor(
    private readonly manifest: Manifest,
    private readonly now: () => number,
  ) {}

  setConsent(value: boolean): void {
    this.consented = value
    if (!value) this.buffer.length = 0
  }

  record(name: string, props: Record<string, string | number | boolean> = {}): boolean {
    if (!this.consented) return false
    if (!this.manifest.telemetry.events.includes(name)) return false
    this.buffer.push({ name, at: this.now(), props })
    return true
  }

  /** Vacía y devuelve lo acumulado. El envío es cosa de la capa de red. */
  drain(): readonly TelemetryEvent[] {
    const out = [...this.buffer]
    this.buffer.length = 0
    return out
  }

  get size(): number {
    return this.buffer.length
  }
}
