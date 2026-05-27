import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { Exercise } from '@/db/schema'
import {
  createCustomExercise,
  getAllExercises,
  removeCustomExercise,
  seedExercisesIfNeeded,
  updateCustomExercise,
} from '@/db/queries'

/**
 * Holds the full exercise library in memory — it is small (~200 rows) and
 * needed by nearly every screen. Hydrates once; seeds on first run.
 */
export const useExercisesStore = defineStore('exercises', () => {
  const all = ref<Exercise[]>([])
  const loading = ref(false)
  const hydrated = ref(false)
  const error = ref<string | null>(null)

  /** Exercises keyed by id, for fast lookup when resolving routine/set rows. */
  const byId = computed(() => {
    const map = new Map<string, Exercise>()
    for (const exercise of all.value) map.set(exercise.id, exercise)
    return map
  })

  async function hydrate(): Promise<void> {
    if (hydrated.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      await seedExercisesIfNeeded()
      all.value = await getAllExercises()
      hydrated.value = true
    } catch (cause: unknown) {
      error.value = 'Could not load the exercise library.'
      console.error('[hadid] failed to hydrate exercises', cause)
    } finally {
      loading.value = false
    }
  }

  async function addCustom(exercise: Exercise): Promise<void> {
    try {
      await createCustomExercise(exercise)
      all.value = [...all.value, exercise]
    } catch (cause: unknown) {
      console.error('[hadid] failed to create custom exercise', cause)
      throw cause
    }
  }

  async function saveCustom(exercise: Exercise): Promise<void> {
    try {
      await updateCustomExercise(exercise)
      const idx = all.value.findIndex((e) => e.id === exercise.id)
      if (idx >= 0) all.value[idx] = exercise
    } catch (cause: unknown) {
      console.error('[hadid] failed to save custom exercise', cause)
      throw cause
    }
  }

  async function removeCustom(exerciseId: string): Promise<void> {
    const existing = all.value.find((e) => e.id === exerciseId)
    if (existing === undefined || !existing.is_custom) return
    const now = Date.now()
    const deleted: Exercise = { ...existing, deleted_at: now, updated_at: now }
    try {
      await removeCustomExercise(deleted)
      all.value = all.value.filter((e) => e.id !== exerciseId)
    } catch (cause: unknown) {
      console.error('[hadid] failed to delete custom exercise', cause)
    }
  }

  return { all, byId, loading, hydrated, error, hydrate, addCustom, saveCustom, removeCustom }
})
