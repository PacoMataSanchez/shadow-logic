/**
 * Huella de reglas — función pura, sin dependencias de plataforma.
 *
 * Vive aquí y no en el juego porque la necesitan tanto el motor como las
 * herramientas, y `@game/core` es lo único que ambos pueden importar. Nada de
 * `node:crypto`: un motor tiene que poder ejecutarse tal cual en React Native.
 */

/**
 * Separador entre ficheros. **Forma parte de la huella: no se toca.**
 *
 * Es NUL y no un espacio a propósito: un NUL no puede aparecer dentro de un
 * fichero fuente, así que dos repartos distintos del mismo texto —«ab»+«c» y
 * «a»+«bc»— nunca colisionan. Cambiarlo marcaría todos los niveles del catálogo
 * como pendientes de revalidar sin que ninguna regla haya cambiado.
 */
const SEP = '\u0000'

/** FNV-1a de 64 bits sobre BigInt. Determinista, sin dependencias, suficiente aquí. */
export function hashRules(sources: readonly string[]): string {
  const PRIME = 0x100000001b3n
  const MASK = 0xffffffffffffffffn
  let h = 0xcbf29ce484222325n
  const text = sources.join(SEP)
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i) & 0xff)
    h = (h * PRIME) & MASK
    h ^= BigInt(text.charCodeAt(i) >> 8)
    h = (h * PRIME) & MASK
  }
  return h.toString(16).padStart(16, '0')
}
