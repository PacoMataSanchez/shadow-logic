/**
 * Progreso persistido.
 *
 * Volumen pequeño, lectura completa al arrancar (A-06). Lo que importa aquí no
 * es el almacén —eso es AsyncStorage o lo que sea— sino dos cosas:
 *
 *   1. **La forma tiene versión y migración.** Un juego que lleva un año en la
 *      tienda no puede permitirse que un cambio de esquema borre el progreso de
 *      la gente, y ése es el bug que nadie prueba hasta que ocurre.
 *   2. **Las marcas nunca empeoran.** Volver a jugar un nivel y hacerlo peor no
 *      quita estrellas.
 */

export const PROGRESS_VERSION = 1

export interface LevelRecord {
  readonly stars: 0 | 1 | 2 | 3
  readonly perfect: boolean
  /** Mejor puntuación según la dirección del manifiesto. */
  readonly bestScore: number
  /** Récord personal de tiempo, en ms. S-20: se guarda, no puntúa. */
  readonly bestMs?: number
  readonly completedAt: number
}

export interface Progress {
  readonly version: number
  readonly levels: Readonly<Record<string, LevelRecord>>
  readonly xp: number
  readonly adCounter: number
  readonly settings: Readonly<Record<string, unknown>>
}

export const EMPTY_PROGRESS: Progress = {
  version: PROGRESS_VERSION,
  levels: {},
  xp: 0,
  adCounter: 0,
  settings: {},
}

export interface StorageAdapter {
  read(key: string): Promise<string | null>
  write(key: string, value: string): Promise<void>
}

/** Almacén de memoria, para pruebas y para el prototipo web. */
export class MemoryStorage implements StorageAdapter {
  private readonly map = new Map<string, string>()
  async read(key: string): Promise<string | null> {
    return this.map.get(key) ?? null
  }
  async write(key: string, value: string): Promise<void> {
    this.map.set(key, value)
  }
}

/**
 * Migraciones. Cada una lleva de la versión N a la N+1.
 * Un progreso de versión desconocida NO se borra: se conserva lo que se entienda.
 */
const MIGRATIONS: readonly ((raw: Record<string, unknown>) => Record<string, unknown>)[] = [
  // v0 → v1: el formato original ya era éste. Placeholder para la primera de verdad.
  (raw) => ({ ...raw, version: 1 }),
]

export function migrate(raw: unknown): Progress {
  if (raw === null || typeof raw !== 'object') return EMPTY_PROGRESS
  let cur = raw as Record<string, unknown>
  let version = typeof cur['version'] === 'number' ? (cur['version'] as number) : 0

  while (version < PROGRESS_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) break
    cur = step(cur)
    version = typeof cur['version'] === 'number' ? (cur['version'] as number) : version + 1
  }

  return {
    version: PROGRESS_VERSION,
    levels: (cur['levels'] as Progress['levels']) ?? {},
    xp: typeof cur['xp'] === 'number' ? cur['xp'] : 0,
    adCounter: typeof cur['adCounter'] === 'number' ? cur['adCounter'] : 0,
    settings: (cur['settings'] as Progress['settings']) ?? {},
  }
}

/** Las marcas nunca empeoran: repetir un nivel y hacerlo peor no quita nada. */
export function recordLevel(
  progress: Progress,
  levelId: string,
  record: LevelRecord,
  lowerIsBetter: boolean,
): Progress {
  const prev = progress.levels[levelId]
  const merged: LevelRecord = prev
    ? {
        stars: Math.max(prev.stars, record.stars) as 0 | 1 | 2 | 3,
        perfect: prev.perfect || record.perfect,
        bestScore: lowerIsBetter
          ? Math.min(prev.bestScore, record.bestScore)
          : Math.max(prev.bestScore, record.bestScore),
        ...(bestTime(prev.bestMs, record.bestMs) !== undefined
          ? { bestMs: bestTime(prev.bestMs, record.bestMs) as number }
          : {}),
        completedAt: record.completedAt,
      }
    : record

  const gainedStars = Math.max(0, merged.stars - (prev?.stars ?? 0))
  return {
    ...progress,
    levels: { ...progress.levels, [levelId]: merged },
    xp: progress.xp + gainedStars * 0, // el XP lo calcula la progresión; aquí solo se guarda
  }
}

function bestTime(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.min(a, b)
}

export function totalStars(progress: Progress): number {
  return Object.values(progress.levels).reduce((sum, r) => sum + r.stars, 0)
}

export function isUnlocked(
  progress: Progress,
  orderedLevelIds: readonly string[],
  levelId: string,
  rule: 'previousComplete' | 'starsTotal',
  starsRequired: number,
): boolean {
  const i = orderedLevelIds.indexOf(levelId)
  if (i <= 0) return true
  if (rule === 'starsTotal') return totalStars(progress) >= starsRequired
  const prev = orderedLevelIds[i - 1] as string
  return progress.levels[prev] !== undefined
}
