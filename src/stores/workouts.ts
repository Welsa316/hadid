import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v7 as uuidv7 } from 'uuid'

import type { Routine, Workout } from '@/db/schema'
import { createWorkout, getMeta, getWorkout, setMeta, updateWorkout } from '@/db/queries'
import { todayLocalDate } from '@/utils/dates'

const ACTIVE_WORKOUT_KEY = 'active_workout_id'

/**
 * Owns the single in-progress workout. The active workout is a persisted
 * `workouts` row from the instant it starts (not in-memory only), so it
 * survives the tab being evicted; `meta.active_workout_id` points at it and
 * `hydrate()` restores it on the next launch.
 */
export const useWorkoutsStore = defineStore('workouts', () => {
  const active = ref<Workout | null>(null)
  const hydrated = ref(false)
  const error = ref<string | null>(null)

  async function hydrate(): Promise<void> {
    if (hydrated.value) return
    try {
      const activeId = await getMeta<string | null>(ACTIVE_WORKOUT_KEY)
      if (typeof activeId === 'string') {
        const workout = await getWorkout(activeId)
        active.value = workout !== undefined && workout.status === 'active' ? workout : null
        if (active.value === null) await setMeta(ACTIVE_WORKOUT_KEY, null)
      }
      hydrated.value = true
    } catch (cause: unknown) {
      error.value = 'Could not restore your workout.'
      console.error('[hadid] failed to hydrate workouts', cause)
    }
  }

  async function start(routine: Routine | null): Promise<Workout> {
    const now = Date.now()
    const workout: Workout = {
      id: uuidv7(),
      routine_id: routine?.id ?? null,
      status: 'active',
      started_at: now,
      ended_at: null,
      duration_seconds: 0,
      notes: '',
      local_date: todayLocalDate(),
      exercise_ids: routine !== null ? [...routine.exercise_ids] : [],
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: null,
      _v: 1,
    }
    active.value = workout
    try {
      await createWorkout(workout)
      await setMeta(ACTIVE_WORKOUT_KEY, workout.id)
    } catch (cause: unknown) {
      active.value = null
      console.error('[hadid] failed to start workout', cause)
      throw cause
    }
    return workout
  }

  async function discard(): Promise<void> {
    const workout = active.value
    if (workout === null) return
    const now = Date.now()
    const discarded: Workout = { ...workout, status: 'discarded', ended_at: now, updated_at: now }
    active.value = null
    try {
      await updateWorkout(discarded)
      await setMeta(ACTIVE_WORKOUT_KEY, null)
    } catch (cause: unknown) {
      active.value = workout
      console.error('[hadid] failed to discard workout', cause)
      throw cause
    }
  }

  return { active, hydrated, error, hydrate, start, discard }
})
