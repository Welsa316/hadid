import { getDB } from './schema'
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from './schema'

/** Bundled-library version. Bump to re-seed/upsert the exercise library. */
const SEED_VERSION = 1

/* --- meta key/value store --------------------------------------------- */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const entry = await db.get('meta', key)
  return entry === undefined ? undefined : (entry.value as T)
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB()
  await db.put('meta', { key, value })
}

/* --- exercises --------------------------------------------------------- */

/** The curatable subset of an exercise stored in the seed JSON. */
interface SeedExercise {
  id: string
  name: string
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  equipment: Equipment
  type: ExerciseType
}

/**
 * Seeds the bundled exercise library into IndexedDB on first run. The seed
 * JSON is loaded via dynamic import so it stays out of the initial bundle.
 * Guarded by `seed_version` in `meta`; uses `put` so a re-run is idempotent.
 */
export async function seedExercisesIfNeeded(): Promise<void> {
  if ((await getMeta<number>('seed_version')) === SEED_VERSION) return

  const { default: seed } = await import('@/data/exercises-seed.json')
  const seedExercises = seed as unknown as SeedExercise[]

  const db = await getDB()
  const tx = db.transaction('exercises', 'readwrite')
  for (const exercise of seedExercises) {
    const record: Exercise = {
      ...exercise,
      is_custom: false,
      created_at: 0,
      updated_at: 0,
      deleted_at: null,
      last_synced_at: null,
      _v: 1,
    }
    void tx.store.put(record)
  }
  await tx.done

  await setMeta('seed_version', SEED_VERSION)
}

/** All non-deleted exercises (seeded and custom). */
export async function getAllExercises(): Promise<Exercise[]> {
  const db = await getDB()
  const all = await db.getAll('exercises')
  return all.filter((exercise) => exercise.deleted_at === null)
}
