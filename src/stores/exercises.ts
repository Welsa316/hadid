import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  return { all, loading, hydrated, error, hydrate }
})
