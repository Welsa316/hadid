import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { v7 as uuidv7 } from 'uuid'

import { getAllGymProfiles, getMeta, putGymProfile, setMeta } from '@/db/queries'
import type { GymProfile, WeightUnit } from '@/db/schema'
import { useSettingsStore } from '@/stores/settings'
import { BAR_PRESETS, DEFAULT_PLATES } from '@/utils/plate-calculator'

const ACTIVE_PROFILE_KEY = 'active_gym_profile_id'

/**
 * Owns the user's gym profiles (bar + plate setups) and tracks which one is
 * active. Device-local — equipment is tied to the gym you're at, not the
 * account. On first launch a default profile is created so the calculator
 * works out of the box.
 */
export const useGymStore = defineStore('gym', () => {
  const all = ref<GymProfile[]>([])
  const activeId = ref<string | null>(null)
  const hydrated = ref(false)

  const settings = useSettingsStore()

  const active = computed<GymProfile | null>(() => {
    if (activeId.value === null) return null
    return all.value.find((profile) => profile.id === activeId.value) ?? null
  })

  function makeDefaultProfile(unit: WeightUnit, name = 'My gym'): GymProfile {
    const now = Date.now()
    const barPreset = BAR_PRESETS[unit][0]
    return {
      id: uuidv7(),
      name,
      unit,
      bar_weight: barPreset?.weight ?? (unit === 'lb' ? 45 : 20),
      plates: DEFAULT_PLATES[unit].map((plate) => ({ ...plate })),
      machine_weights: {},
      created_at: now,
      updated_at: now,
      deleted_at: null,
      last_synced_at: null,
      _v: 1,
    }
  }

  async function hydrate(): Promise<void> {
    if (hydrated.value) return
    try {
      all.value = await getAllGymProfiles()
      const stored = await getMeta<string>(ACTIVE_PROFILE_KEY)
      activeId.value = typeof stored === 'string' ? stored : null
      if (all.value.length === 0) {
        const profile = makeDefaultProfile(settings.unit)
        await putGymProfile(profile)
        all.value = [profile]
        activeId.value = profile.id
        await setMeta(ACTIVE_PROFILE_KEY, profile.id)
      } else if (activeId.value === null || !all.value.some((p) => p.id === activeId.value)) {
        const first = all.value[0]
        activeId.value = first?.id ?? null
        if (activeId.value !== null) await setMeta(ACTIVE_PROFILE_KEY, activeId.value)
      }
      hydrated.value = true
    } catch (cause: unknown) {
      console.error('[hadid] failed to hydrate gym profiles', cause)
    }
  }

  async function setActive(id: string): Promise<void> {
    activeId.value = id
    try {
      await setMeta(ACTIVE_PROFILE_KEY, id)
    } catch (cause: unknown) {
      console.error('[hadid] failed to set active gym profile', cause)
    }
  }

  function newProfile(name: string): GymProfile {
    const profile = makeDefaultProfile(settings.unit, name)
    return profile
  }

  async function save(profile: GymProfile): Promise<void> {
    const next: GymProfile = { ...profile, updated_at: Date.now() }
    const idx = all.value.findIndex((p) => p.id === profile.id)
    if (idx >= 0) all.value[idx] = next
    else all.value.push(next)
    all.value.sort((a, b) => a.name.localeCompare(b.name))
    try {
      await putGymProfile(next)
    } catch (cause: unknown) {
      console.error('[hadid] failed to save gym profile', cause)
      throw cause
    }
  }

  async function remove(id: string): Promise<void> {
    if (all.value.length <= 1) return
    const profile = all.value.find((p) => p.id === id)
    if (profile === undefined) return
    const now = Date.now()
    const deleted: GymProfile = { ...profile, deleted_at: now, updated_at: now }
    all.value = all.value.filter((p) => p.id !== id)
    if (activeId.value === id) {
      const next = all.value[0]?.id ?? null
      activeId.value = next
      if (next !== null) await setMeta(ACTIVE_PROFILE_KEY, next)
    }
    try {
      await putGymProfile(deleted)
    } catch (cause: unknown) {
      console.error('[hadid] failed to delete gym profile', cause)
    }
  }

  async function setMachineWeight(exerciseId: string, weight: number): Promise<void> {
    if (active.value === null) return
    const next: GymProfile = {
      ...active.value,
      machine_weights: { ...active.value.machine_weights, [exerciseId]: weight },
    }
    await save(next)
  }

  return {
    all,
    activeId,
    active,
    hydrated,
    hydrate,
    setActive,
    newProfile,
    save,
    remove,
    setMachineWeight,
  }
})
