import { defineStore } from 'pinia'
import { ref } from 'vue'

import { useRoutinesStore } from '@/stores/routines'
import { useWorkoutsStore } from '@/stores/workouts'
import { getLastSyncedAt, getSyncId, isSyncConfigured, runSync, setSyncId } from '@/sync/sync'

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'error'

/** How often background sync runs while the app is open. */
const SYNC_INTERVAL_MS = 60_000

/**
 * Drives anonymous cross-device sync: a device-generated account code,
 * periodic push/pull, and status for the Settings UI. The app stays fully
 * usable when sync is disabled (no backend configured) or offline.
 */
export const useSyncStore = defineStore('sync', () => {
  const configured = isSyncConfigured()
  const status = ref<SyncStatus>(configured ? 'idle' : 'disabled')
  const syncCode = ref<string>('')
  const lastSyncedAt = ref<number | null>(null)
  const error = ref<string | null>(null)

  /** Pulls synced changes into the in-memory stores after a sync. */
  async function refreshStores(): Promise<void> {
    await useRoutinesStore().refresh()
    await useWorkoutsStore().refresh()
  }

  async function syncNow(): Promise<void> {
    if (!configured || status.value === 'syncing' || !navigator.onLine) return
    status.value = 'syncing'
    error.value = null
    try {
      const result = await runSync()
      lastSyncedAt.value = Date.now()
      status.value = 'idle'
      if (result.pulled > 0) await refreshStores()
    } catch (cause: unknown) {
      status.value = 'error'
      error.value = 'Sync failed — it will retry automatically.'
      console.error('[hadid] sync failed', cause)
    }
  }

  /** Starts background sync: an immediate run, a timer, and on reconnect. */
  async function start(): Promise<void> {
    if (!configured) return
    syncCode.value = await getSyncId()
    lastSyncedAt.value = (await getLastSyncedAt()) ?? null
    void syncNow()
    window.setInterval(() => void syncNow(), SYNC_INTERVAL_MS)
    window.addEventListener('online', () => void syncNow())
  }

  /** Links this device to an existing account by entering its sync code. */
  async function linkDevice(code: string): Promise<void> {
    const trimmed = code.trim()
    if (trimmed.length < 8) {
      error.value = 'That sync code looks invalid.'
      return
    }
    await setSyncId(trimmed)
    syncCode.value = trimmed
    await syncNow()
  }

  return { status, syncCode, lastSyncedAt, error, start, syncNow, linkDevice }
})
