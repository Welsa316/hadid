import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

export const DB_NAME = 'hadid'
export const DB_VERSION = 1

/* ------------------------------------------------------------------ *
 * Domain enums
 * ------------------------------------------------------------------ */

/** Fine-grained muscle taxonomy used on exercises (15 groups). */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'cardio'
  | 'full_body'

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'band'
  | 'bodyweight'
  | 'ez_bar'
  | 'smith_machine'
  | 'cardio'
  | 'other'

export type ExerciseType = 'compound' | 'isolation' | 'bodyweight' | 'cardio'

export type WeightUnit = 'lb' | 'kg'

export type WorkoutStatus = 'active' | 'completed' | 'discarded'

export type PrType = '1rm_estimate' | 'heaviest_weight' | 'most_reps'

export type OutboxEntity = 'exercise' | 'routine' | 'workout' | 'set' | 'pr'

export type OutboxOp = 'create' | 'update' | 'delete'

/* ------------------------------------------------------------------ *
 * Records
 * ------------------------------------------------------------------ */

/**
 * Fields carried by every syncable domain record. They exist so a future
 * server sync layer can be additive: client-generated ids never collide,
 * `updated_at` drives last-write-wins, and `deleted_at` enables tombstoning
 * (hard deletes would resurrect on the next pull).
 */
export interface SyncedRecord {
  /** Client-generated UUIDv7 — time-ordered and collision-free across devices. */
  id: string
  /** Epoch milliseconds. */
  created_at: number
  /** Epoch milliseconds. */
  updated_at: number
  /** Epoch milliseconds of soft-deletion, or null while live. */
  deleted_at: number | null
  /** Epoch milliseconds the server last acknowledged this record, or null. */
  last_synced_at: number | null
  /** Row schema version, for future per-record migrations. */
  _v: number
}

export interface Exercise extends SyncedRecord {
  name: string
  primary_muscle: MuscleGroup
  secondary_muscles: MuscleGroup[]
  equipment: Equipment
  type: ExerciseType
  is_custom: boolean
}

export interface Routine extends SyncedRecord {
  name: string
  exercise_ids: string[]
  /** User-defined sort position within the routine list. */
  order: number
}

export interface Workout extends SyncedRecord {
  routine_id: string | null
  status: WorkoutStatus
  started_at: number
  ended_at: number | null
  duration_seconds: number
  notes: string
  /** Local calendar day (YYYY-MM-DD) the workout belongs to — avoids the
   *  UTC-bucketing bug where a late-evening workout lands on the wrong day. */
  local_date: string
}

/** A single logged set. Named `WorkoutSet` to avoid clashing with the JS `Set`. */
export interface WorkoutSet extends SyncedRecord {
  workout_id: string
  exercise_id: string
  set_number: number
  reps: number
  weight: number
  /** Unit the weight was entered in — stored per set so history stays faithful
   *  if the user changes their default unit later. */
  weight_unit: WeightUnit
  is_warmup: boolean
  is_pr: boolean
  completed_at: number | null
}

export interface PersonalRecord extends SyncedRecord {
  exercise_id: string
  type: PrType
  value: number
  weight_unit: WeightUnit
  achieved_at: number
  workout_id: string
  /** Source set — lets a PR be invalidated if that set is edited or deleted. */
  set_id: string
}

/** A pending mutation awaiting a future cloud-sync push. */
export interface OutboxEntry {
  id: string
  entity: OutboxEntity
  entity_id: string
  op: OutboxOp
  /** Snapshot of the record at mutation time. */
  payload: unknown
  created_at: number
  attempts: number
  last_error: string | null
}

/** Local-only key/value store: seed flags, schema version, user settings. */
export interface MetaEntry {
  key: string
  value: unknown
}

/* ------------------------------------------------------------------ *
 * IndexedDB schema
 * ------------------------------------------------------------------ */

export interface HadidDB extends DBSchema {
  exercises: {
    key: string
    value: Exercise
    indexes: {
      by_primary_muscle: MuscleGroup
      by_type: ExerciseType
    }
  }
  routines: {
    key: string
    value: Routine
    indexes: {
      by_updated_at: number
    }
  }
  workouts: {
    key: string
    value: Workout
    indexes: {
      by_started_at: number
      by_status: WorkoutStatus
      by_local_date: string
    }
  }
  sets: {
    key: string
    value: WorkoutSet
    indexes: {
      by_workout_id: string
      by_exercise_id: string
      /** Compound [exercise_id, completed_at] — powers progress graphs,
       *  PR detection, and the "previous workout" auto-fill lookup. */
      by_exercise_completed: [string, number]
    }
  }
  prs: {
    key: string
    value: PersonalRecord
    indexes: {
      by_exercise_id: string
      by_exercise_type: [string, PrType]
    }
  }
  outbox: {
    key: string
    value: OutboxEntry
    indexes: {
      by_created_at: number
    }
  }
  meta: {
    key: string
    value: MetaEntry
  }
}

export type HadidDatabase = IDBPDatabase<HadidDB>

let dbPromise: Promise<HadidDatabase> | null = null

/**
 * Returns the shared IndexedDB connection, opening it on first use.
 *
 * `is_custom` on `exercises` is intentionally NOT indexed: IndexedDB cannot use
 * boolean values as index keys, so such records would be silently excluded from
 * the index. Exercises are held in memory, so custom-vs-seeded is filtered there.
 */
export function getDB(): Promise<HadidDatabase> {
  if (dbPromise === null) {
    dbPromise = openDB<HadidDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const exercises = db.createObjectStore('exercises', { keyPath: 'id' })
        exercises.createIndex('by_primary_muscle', 'primary_muscle')
        exercises.createIndex('by_type', 'type')

        const routines = db.createObjectStore('routines', { keyPath: 'id' })
        routines.createIndex('by_updated_at', 'updated_at')

        const workouts = db.createObjectStore('workouts', { keyPath: 'id' })
        workouts.createIndex('by_started_at', 'started_at')
        workouts.createIndex('by_status', 'status')
        workouts.createIndex('by_local_date', 'local_date')

        const sets = db.createObjectStore('sets', { keyPath: 'id' })
        sets.createIndex('by_workout_id', 'workout_id')
        sets.createIndex('by_exercise_id', 'exercise_id')
        sets.createIndex('by_exercise_completed', ['exercise_id', 'completed_at'])

        const prs = db.createObjectStore('prs', { keyPath: 'id' })
        prs.createIndex('by_exercise_id', 'exercise_id')
        prs.createIndex('by_exercise_type', ['exercise_id', 'type'])

        const outbox = db.createObjectStore('outbox', { keyPath: 'id' })
        outbox.createIndex('by_created_at', 'created_at')

        db.createObjectStore('meta', { keyPath: 'key' })
      },
      blocked() {
        console.warn('[hadid] IndexedDB open is blocked by another connection')
      },
      blocking() {
        console.warn('[hadid] this IndexedDB connection is blocking a version upgrade')
      },
      terminated() {
        // The browser dropped the connection — clear the cache so the next
        // call reopens rather than reusing a dead handle.
        console.error('[hadid] IndexedDB connection terminated unexpectedly')
        dbPromise = null
      },
    })
  }
  return dbPromise
}

/**
 * Opens the database during app start-up. Surfaces failures to the caller so
 * the boot sequence can show an error state instead of failing silently.
 */
export function initDB(): Promise<HadidDatabase> {
  return getDB()
}
