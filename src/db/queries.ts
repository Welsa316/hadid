import { v7 as uuidv7 } from 'uuid'

import { detectPrs } from '@/utils/pr-detection'
import { getDB } from './schema'
import type {
  Equipment,
  Exercise,
  ExerciseType,
  HadidDB,
  MuscleGroup,
  OutboxEntity,
  OutboxOp,
  PersonalRecord,
  Routine,
  Workout,
  WorkoutSet,
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

/** Completed workouts, most recent first. */
export async function getCompletedWorkouts(): Promise<Workout[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('workouts', 'by_status', 'completed')
  return all
    .filter((workout) => workout.deleted_at === null)
    .sort((a, b) => b.started_at - a.started_at)
}

/* --- sets -------------------------------------------------------------- */

/** All non-deleted sets belonging to a workout. */
export async function getSetsByWorkout(workoutId: string): Promise<WorkoutSet[]> {
  const db = await getDB()
  const sets = await db.getAllFromIndex('sets', 'by_workout_id', workoutId)
  return sets.filter((set) => set.deleted_at === null)
}

/**
 * The most recent completed set logged for an exercise, used to auto-fill a
 * new set. Walks the [exercise_id, completed_at] index newest-first.
 */
export async function getLastSetForExercise(exerciseId: string): Promise<WorkoutSet | undefined> {
  const db = await getDB()
  const index = db.transaction('sets').store.index('by_exercise_completed')
  const range = IDBKeyRange.bound([exerciseId], [exerciseId, []])
  let cursor = await index.openCursor(range, 'prev')
  while (cursor !== null) {
    if (cursor.value.deleted_at === null) return cursor.value
    cursor = await cursor.continue()
  }
  return undefined
}

/** All non-deleted sets logged for an exercise, across every workout. */
export async function getSetsByExercise(exerciseId: string): Promise<WorkoutSet[]> {
  const db = await getDB()
  const sets = await db.getAllFromIndex('sets', 'by_exercise_id', exerciseId)
  return sets.filter((set) => set.deleted_at === null)
}

/** Every non-deleted set. Used by the calendar to aggregate muscle volume. */
export async function getAllSets(): Promise<WorkoutSet[]> {
  const db = await getDB()
  const sets = await db.getAll('sets')
  return sets.filter((set) => set.deleted_at === null)
}

/**
 * Sets for an exercise from its most recent *completed* workout, excluding the
 * given workout. Powers the "last time" hint shown while logging.
 */
export async function getLastWorkoutSetsForExercise(
  exerciseId: string,
  excludeWorkoutId: string,
): Promise<WorkoutSet[]> {
  const sets = await getSetsByExercise(exerciseId)
  const completedIds = new Set((await getCompletedWorkouts()).map((workout) => workout.id))
  const priorSets = sets.filter(
    (set) => set.workout_id !== excludeWorkoutId && completedIds.has(set.workout_id),
  )
  if (priorSets.length === 0) return []
  const latest = priorSets.reduce((best, set) =>
    (set.completed_at ?? 0) > (best.completed_at ?? 0) ? set : best,
  )
  return priorSets
    .filter((set) => set.workout_id === latest.workout_id)
    .sort((a, b) => a.set_number - b.set_number)
}

export async function createSet(set: WorkoutSet): Promise<void> {
  await persistMutation('sets', set, 'create')
}

export async function updateSet(set: WorkoutSet): Promise<void> {
  await persistMutation('sets', set, 'update')
}

/** Persists a soft-deleted set (caller sets `deleted_at`). */
export async function removeSet(set: WorkoutSet): Promise<void> {
  await persistMutation('sets', set, 'delete')
}

/* --- personal records -------------------------------------------------- */

export async function createPr(pr: PersonalRecord): Promise<void> {
  await persistMutation('prs', pr, 'create')
}

/**
 * Detects personal records for a just-finished workout: writes a `prs` record
 * for each and flags the achieving set `is_pr`. Called before the workout is
 * marked completed, so the current workout is excluded from prior history.
 */
export async function detectWorkoutPrs(
  workoutId: string,
  workoutSets: WorkoutSet[],
): Promise<void> {
  const completedIds = new Set((await getCompletedWorkouts()).map((workout) => workout.id))

  const setsByExercise = new Map<string, WorkoutSet[]>()
  for (const set of workoutSets) {
    const group = setsByExercise.get(set.exercise_id) ?? []
    group.push(set)
    setsByExercise.set(set.exercise_id, group)
  }

  for (const [exerciseId, newSets] of setsByExercise) {
    const allSets = await getSetsByExercise(exerciseId)
    const priorSets = allSets.filter(
      (set) => set.workout_id !== workoutId && completedIds.has(set.workout_id),
    )
    for (const hit of detectPrs(newSets, priorSets)) {
      const set = workoutSets.find((candidate) => candidate.id === hit.setId)
      if (set === undefined) continue
      const now = Date.now()
      await createPr({
        id: uuidv7(),
        exercise_id: exerciseId,
        type: hit.type,
        value: hit.value,
        weight_unit: set.weight_unit,
        achieved_at: set.completed_at ?? now,
        workout_id: workoutId,
        set_id: set.id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        last_synced_at: null,
        _v: 1,
      })
      if (!set.is_pr) await updateSet({ ...set, is_pr: true, updated_at: now })
    }
  }
}
