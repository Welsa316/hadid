import { defineStore } from 'pinia'
import { ref } from 'vue'
import { v7 as uuidv7 } from 'uuid'

import type { Routine } from '@/db/schema'
import { createRoutine, getAllRoutines, removeRoutine, updateRoutine } from '@/db/queries'

/**
 * Reusable workout templates. Every mutation updates in-memory state first
 * (so the UI repaints immediately), then writes through to IndexedDB; a
 * failed write rolls the in-memory change back.
 */
export const useRoutinesStore = defineStore('routines', () => {
  const all = ref<Routine[]>([])
  const loading = ref(false)
  const hydrated = ref(false)
  const error = ref<string | null>(null)

  async function hydrate(): Promise<void> {
    if (hydrated.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      all.value = await getAllRoutines()
      hydrated.value = true
    } catch (cause: unknown) {
      error.value = 'Could not load your routines.'
      console.error('[hadid] failed to hydrate routines', cause)
    } finally {
      loading.value = false
    }
  }

  async function create(name: string, exerciseIds: string[]): Promise<Routine> {
    const now = Date.now()
    const routine: Routine = {
      id: uuidv7(),
      name,
      exercise_ids: exerciseIds,
      order: all.value.length,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: null,
      _v: 1,
    }
    all.value.push(routine)
    try {
      await createRoutine(routine)
    } catch (cause: unknown) {
      all.value = all.value.filter((entry) => entry.id !== routine.id)
      throw cause
    }
    return routine
  }

  async function save(routine: Routine, patch: { name: string; exercise_ids: string[] }): Promise<void> {
    const index = all.value.findIndex((entry) => entry.id === routine.id)
    const previous = index >= 0 ? all.value[index] : undefined
    const updated: Routine = { ...routine, ...patch, updated_at: Date.now() }
    if (index >= 0) all.value[index] = updated
    try {
      await updateRoutine(updated)
    } catch (cause: unknown) {
      if (index >= 0 && previous !== undefined) all.value[index] = previous
      throw cause
    }
  }

  async function remove(id: string): Promise<void> {
    const index = all.value.findIndex((entry) => entry.id === id)
    const routine = index >= 0 ? all.value[index] : undefined
    if (routine === undefined) return
    const now = Date.now()
    const deleted: Routine = { ...routine, deleted_at: now, updated_at: now }
    all.value.splice(index, 1)
    try {
      await removeRoutine(deleted)
    } catch (cause: unknown) {
      all.value.splice(index, 0, routine)
      throw cause
    }
  }

  return { all, loading, hydrated, error, hydrate, create, save, remove }
})
