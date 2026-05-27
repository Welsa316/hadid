import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v7 as uuidv7 } from 'uuid'

import type { Routine, Workout, WorkoutSet } from '@/db/schema'
import {
  createSet,
  createWorkout,
  detectWorkoutPrs,
  getLastSetForExercise,
  getMeta,
  getSetsByWorkout,
  getWorkout,
  removeSet,
  setMeta,
  updateSet,
  updateWorkout,
} from '@/db/queries'
import { useRestTimerStore } from '@/stores/restTimer'
import { useSettingsStore } from '@/stores/settings'
import { localDateOf } from '@/utils/dates'
import { workoutVolume } from '@/utils/volume-calc'

const ACTIVE_WORKOUT_KEY = 'active_workout_id'

/**
 * Owns the single in-progress workout and its logged sets. The active workout
 * and every set are persisted to IndexedDB as they happen (not in-memory
 * only), so the session survives the tab being evicted; `hydrate()` restores
 * both on the next launch.
 */
export const useWorkoutsStore = defineStore('workouts', () => {
  const active = ref<Workout | null>(null)
  const activeSets = ref<WorkoutSet[]>([])
  const hydrated = ref(false)
  const error = ref<string | null>(null)

  const settingsStore = useSettingsStore()

  async function hydrate(): Promise<void> {
    if (hydrated.value) return
    try {
      const activeId = await getMeta<string | null>(ACTIVE_WORKOUT_KEY)
      if (typeof activeId === 'string') {
        const workout = await getWorkout(activeId)
        if (workout !== undefined && workout.status === 'active') {
          active.value = workout
          activeSets.value = await getSetsByWorkout(workout.id)
        } else {
          await setMeta(ACTIVE_WORKOUT_KEY, null)
        }
      }
      hydrated.value = true
    } catch (cause: unknown) {
      error.value = 'Could not restore your workout.'
      console.error('[hadid] failed to hydrate workouts', cause)
    }
  }

  /** Re-reads the active workout from storage — used after a sync pulls changes. */
  async function refresh(): Promise<void> {
    try {
      const activeId = await getMeta<string | null>(ACTIVE_WORKOUT_KEY)
      if (typeof activeId === 'string') {
        const workout = await getWorkout(activeId)
        if (workout !== undefined && workout.status === 'active') {
          active.value = workout
          activeSets.value = await getSetsByWorkout(workout.id)
          return
        }
      }
      active.value = null
      activeSets.value = []
    } catch (cause: unknown) {
      console.error('[hadid] failed to refresh workouts', cause)
    }
  }

  async function start(
    routine: Routine | null,
    opts: { startedAt?: number; endedAt?: number } = {},
  ): Promise<Workout> {
    const now = Date.now()
    const startedAt = opts.startedAt ?? now
    const endedAt = opts.endedAt ?? null
    const workout: Workout = {
      id: uuidv7(),
      routine_id: routine?.id ?? null,
      status: 'active',
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds:
        endedAt !== null ? Math.max(0, Math.floor((endedAt - startedAt) / 1000)) : 0,
      notes: '',
      local_date: localDateOf(startedAt),
      exercise_ids: routine !== null ? routine.exercises.map((entry) => entry.exercise_id) : [],
      exercise_groups:
        routine === null
          ? {}
          : routine.exercises.reduce<Record<string, string>>((acc, entry) => {
              if (entry.group_id !== undefined) acc[entry.exercise_id] = entry.group_id
              return acc
            }, {}),
      weight_unit: settingsStore.unit,
      total_volume: 0,
      set_count: 0,
      exercise_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: null,
      _v: 1,
    }

    // Pre-create set rows from the routine's per-exercise targets, auto-filling
    // each set's weight from that exercise's last logged set.
    const sets: WorkoutSet[] = []
    if (routine !== null) {
      for (const entry of routine.exercises) {
        const last = await getLastSetForExercise(entry.exercise_id)
        const weight =
          last !== undefined && last.weight_unit === workout.weight_unit ? last.weight : 0
        for (let number = 1; number <= entry.target_sets; number += 1) {
          sets.push({
            id: uuidv7(),
            workout_id: workout.id,
            exercise_id: entry.exercise_id,
            set_number: number,
            reps: entry.target_reps,
            weight,
            weight_unit: workout.weight_unit,
            is_warmup: false,
            is_pr: false,
            completed_at: now,
            created_at: now,
            updated_at: now,
            deleted_at: null,
            last_synced_at: null,
            _v: 1,
          })
        }
      }
    }

    active.value = workout
    activeSets.value = sets
    try {
      await createWorkout(workout)
      for (const set of sets) await createSet(set)
      await setMeta(ACTIVE_WORKOUT_KEY, workout.id)
    } catch (cause: unknown) {
      active.value = null
      activeSets.value = []
      console.error('[hadid] failed to start workout', cause)
      throw cause
    }
    return workout
  }

  /**
   * Completes the active workout: detects personal records, records the
   * summary, and saves it. Returns the finished workout's id.
   */
  async function finish(): Promise<string | null> {
    const workout = active.value
    if (workout === null) return null
    const sets = activeSets.value

    // PR detection is best-effort — a failure must not block finishing.
    try {
      await detectWorkoutPrs(workout.id, sets)
    } catch (cause: unknown) {
      console.error('[hadid] PR detection failed', cause)
    }

    const now = Date.now()
    // Past-workout entries (logged retroactively) come in with ended_at and
    // duration_seconds already set — preserve those instead of stamping "now".
    const isPastEntry = workout.ended_at !== null
    const endedAt = isPastEntry ? workout.ended_at : now
    const duration = isPastEntry
      ? workout.duration_seconds
      : Math.floor((now - workout.started_at) / 1000)
    const completed: Workout = {
      ...workout,
      status: 'completed',
      ended_at: endedAt,
      duration_seconds: duration,
      total_volume: workoutVolume(sets),
      set_count: sets.length,
      exercise_count: new Set(sets.map((set) => set.exercise_id)).size,
      updated_at: now,
    }
    active.value = null
    activeSets.value = []
    try {
      await updateWorkout(completed)
      await setMeta(ACTIVE_WORKOUT_KEY, null)
    } catch (cause: unknown) {
      active.value = workout
      activeSets.value = sets
      console.error('[hadid] failed to finish workout', cause)
      throw cause
    }
    return workout.id
  }

  /** Abandons the active workout — marks it discarded, keeps nothing. */
  async function discard(): Promise<void> {
    const workout = active.value
    if (workout === null) return
    const now = Date.now()
    const discarded: Workout = { ...workout, status: 'discarded', ended_at: now, updated_at: now }
    active.value = null
    activeSets.value = []
    try {
      await updateWorkout(discarded)
      await setMeta(ACTIVE_WORKOUT_KEY, null)
    } catch (cause: unknown) {
      active.value = workout
      console.error('[hadid] failed to discard workout', cause)
      throw cause
    }
  }

  /** Appends exercises to the active workout's lineup. */
  async function addExercises(exerciseIds: string[]): Promise<void> {
    const workout = active.value
    if (workout === null || exerciseIds.length === 0) return
    const updated: Workout = {
      ...workout,
      exercise_ids: [...workout.exercise_ids, ...exerciseIds],
      updated_at: Date.now(),
    }
    active.value = updated
    try {
      await updateWorkout(updated)
    } catch (cause: unknown) {
      active.value = workout
      console.error('[hadid] failed to add exercises', cause)
      throw cause
    }
  }

  /**
   * Logs a new set for an exercise, auto-filled from the last set of that
   * exercise — first from this workout, then from the most recent past one.
   */
  async function addSet(exerciseId: string): Promise<void> {
    const workout = active.value
    if (workout === null) return
    const existing = activeSets.value.filter((set) => set.exercise_id === exerciseId)
    const template = existing.at(-1) ?? (await getLastSetForExercise(exerciseId))
    // Carry the previous weight only when its unit matches this workout's.
    const weight =
      template !== undefined && template.weight_unit === workout.weight_unit
        ? template.weight
        : 0
    const now = Date.now()
    const set: WorkoutSet = {
      id: uuidv7(),
      workout_id: workout.id,
      exercise_id: exerciseId,
      set_number: existing.length + 1,
      reps: template?.reps ?? 0,
      weight,
      weight_unit: workout.weight_unit,
      is_warmup: false,
      is_pr: false,
      completed_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: null,
      _v: 1,
    }
    activeSets.value.push(set)
    try {
      await createSet(set)
    } catch (cause: unknown) {
      activeSets.value = activeSets.value.filter((entry) => entry.id !== set.id)
      console.error('[hadid] failed to add set', cause)
      throw cause
    }
    // Adding a row signals "I'm moving to the next set" — start the rest timer.
    if (settingsStore.restAutoStart) {
      useRestTimerStore().start(settingsStore.defaultRestSeconds)
    }
  }

  async function editSet(updatedSet: WorkoutSet): Promise<void> {
    const index = activeSets.value.findIndex((set) => set.id === updatedSet.id)
    const previous = index >= 0 ? activeSets.value[index] : undefined
    if (previous === undefined) return
    const next: WorkoutSet = { ...updatedSet, updated_at: Date.now() }
    activeSets.value[index] = next
    try {
      await updateSet(next)
    } catch (cause: unknown) {
      activeSets.value[index] = previous
      console.error('[hadid] failed to update set', cause)
      throw cause
    }
  }

  async function deleteSet(setId: string): Promise<void> {
    const index = activeSets.value.findIndex((set) => set.id === setId)
    const set = index >= 0 ? activeSets.value[index] : undefined
    if (set === undefined) return
    const now = Date.now()
    const deleted: WorkoutSet = { ...set, deleted_at: now, updated_at: now }
    activeSets.value.splice(index, 1)
    try {
      await removeSet(deleted)
    } catch (cause: unknown) {
      activeSets.value.splice(index, 0, set)
      console.error('[hadid] failed to delete set', cause)
      throw cause
    }
  }

  return {
    active,
    activeSets,
    hydrated,
    error,
    hydrate,
    refresh,
    start,
    finish,
    discard,
    addExercises,
    addSet,
    editSet,
    deleteSet,
  }
})
