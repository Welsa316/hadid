import { v7 as uuidv7 } from 'uuid'

import { getDB } from './schema'
import type {
  Equipment,
  Exercise,
  ExerciseType,
  HadidDB,
  MuscleGroup,
  OutboxEntity,
  OutboxOp,
  Routine,
  Workout,
} from './schema'

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

/* --- write-through mutations ------------------------------------------ *
 * Every user mutation writes the record and an outbox entry in a single
 * transaction. The outbox is the ordered change log a future cloud-sync
 * layer will replay; pairing the two writes keeps them consistent.        */

type SyncStoreName = 'routines' | 'workouts' | 'sets' | 'prs'

const OUTBOX_ENTITY_BY_STORE: Record<SyncStoreName, OutboxEntity> = {
  routines: 'routine',
  workouts: 'workout',
  sets: 'set',
  prs: 'pr',
}

/**
 * Deep-clones a record into a plain object. Records reaching this layer often
 * carry Vue reactive proxies (e.g. arrays bound to component state), and
 * IndexedDB's structured clone throws on a Proxy. A JSON round-trip is safe
 * here because every stored record is pure JSON data.
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

async function persistMutation<S extends SyncStoreName>(
  store: S,
  record: HadidDB[S]['value'],
  op: OutboxOp,
): Promise<void> {
  const plain = toPlain(record)
  const db = await getDB()
  const tx = db.transaction([store, 'outbox'], 'readwrite')
  void tx.objectStore(store).put(plain)
  void tx.objectStore('outbox').put({
    id: uuidv7(),
    entity: OUTBOX_ENTITY_BY_STORE[store],
    entity_id: plain.id,
    op,
    payload: plain,
    created_at: Date.now(),
    attempts: 0,
    last_error: null,
  })
  await tx.done
}

/* --- routines ---------------------------------------------------------- */

/** All non-deleted routines. */
export async function getAllRoutines(): Promise<Routine[]> {
  const db = await getDB()
  const all = await db.getAll('routines')
  return all.filter((routine) => routine.deleted_at === null)
}

export async function createRoutine(routine: Routine): Promise<void> {
  await persistMutation('routines', routine, 'create')
}

export async function updateRoutine(routine: Routine): Promise<void> {
  await persistMutation('routines', routine, 'update')
}

/** Persists a soft-deleted routine (caller sets `deleted_at`). */
export async function removeRoutine(routine: Routine): Promise<void> {
  await persistMutation('routines', routine, 'delete')
}

/* --- workouts ---------------------------------------------------------- */

export async function getWorkout(id: string): Promise<Workout | undefined> {
  const db = await getDB()
  return db.get('workouts', id)
}

export async function createWorkout(workout: Workout): Promise<void> {
  await persistMutation('workouts', workout, 'create')
}

export async function updateWorkout(workout: Workout): Promise<void> {
  await persistMutation('workouts', workout, 'update')
}
