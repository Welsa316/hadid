<script setup lang="ts">
import { onMounted, ref } from 'vue'

import BottomNav from '@/components/BottomNav.vue'
import ChangelogModal from '@/components/ChangelogModal.vue'
import { CHANGELOG, compareVersions } from '@/data/changelog'
import type { ChangelogEntry } from '@/data/changelog'
import { getMeta, setMeta } from '@/db/queries'
import { useExercisesStore } from '@/stores/exercises'
import { useGymStore } from '@/stores/gym'
import { useRoutinesStore } from '@/stores/routines'
import { useSyncStore } from '@/stores/sync'
import { useWorkoutsStore } from '@/stores/workouts'

const LAST_SEEN_VERSION_KEY = 'last_seen_version'

const unseenEntries = ref<ChangelogEntry[]>([])
const changelogOpen = ref(false)

// Hydrate core data once at app start. The exercise library seeds the bundled
// library into IndexedDB on first run; the workouts store restores an
// in-progress workout if the app was closed mid-session.
void useExercisesStore().hydrate()
void useRoutinesStore().hydrate()
void useWorkoutsStore().hydrate()
void useGymStore().hydrate()

// Start background sync. A no-op when no backend is configured
// (VITE_SYNC_URL unset) — the app stays fully offline-only.
void useSyncStore().start()

// Surface a "What's new" sheet on launch for releases this device has not
// yet seen. A brand-new install silently adopts the current version, so we
// don't greet first-time users with a wall of historical release notes.
onMounted(async () => {
  const newest = CHANGELOG[0]?.version
  if (newest === undefined) return
  try {
    const lastSeen = await getMeta<string>(LAST_SEEN_VERSION_KEY)
    if (lastSeen === undefined) {
      await setMeta(LAST_SEEN_VERSION_KEY, newest)
      return
    }
    if (compareVersions(lastSeen, newest) >= 0) return
    unseenEntries.value = CHANGELOG.filter(
      (entry) => compareVersions(lastSeen, entry.version) < 0,
    )
    changelogOpen.value = true
  } catch (cause: unknown) {
    console.error('[hadid] changelog check failed', cause)
  }
})

async function dismissChangelog(): Promise<void> {
  changelogOpen.value = false
  const newest = CHANGELOG[0]?.version
  if (newest === undefined) return
  try {
    await setMeta(LAST_SEEN_VERSION_KEY, newest)
  } catch (cause: unknown) {
    console.error('[hadid] failed to record last seen version', cause)
  }
}
</script>

<template>
  <RouterView />
  <BottomNav />
  <ChangelogModal
    v-if="changelogOpen"
    :entries="unseenEntries"
    @close="dismissChangelog"
  />
</template>
