/**
 * PRNG con semilla, solo para herramientas de autoría.
 *
 * `engine/` tiene prohibido `Math.random()` (§38). `tools/` no: pero el azar
 * debe ser reproducible, para que una tanda de generación se pueda repetir
 * exactamente y un nivel se pueda rastrear hasta su semilla.
 */

export interface Rng {
  next(): number
  int(maxExclusive: number): number
  pick<T>(xs: readonly T[]): T
  shuffled<T>(xs: readonly T[]): T[]
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive)
  return {
    next,
    int,
    pick<T>(xs: readonly T[]): T {
      return xs[int(xs.length)] as T
    },
    shuffled<T>(xs: readonly T[]): T[] {
      const out = [...xs]
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1)
        ;[out[i], out[j]] = [out[j] as T, out[i] as T]
      }
      return out
    },
  }
}
