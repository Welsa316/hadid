import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { Exercise } from '@/db/schema'
import { getAllExercises, seedExercisesIfNeeded } from '@/db/queries'

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

  return { all, byId, loading, hydrated, error, hydrate }
})
