<script setup lang="ts">
import BottomNav from '@/components/BottomNav.vue'
import { useExercisesStore } from '@/stores/exercises'
import { useRoutinesStore } from '@/stores/routines'
import { useWorkoutsStore } from '@/stores/workouts'

// Hydrate core data once at app start. The exercise library seeds the bundled
// library into IndexedDB on first run; the workouts store restores an
// in-progress workout if the app was closed mid-session.
void useExercisesStore().hydrate()
void useRoutinesStore().hydrate()
void useWorkoutsStore().hydrate()
</script>

<template>
  <RouterView />
  <BottomNav />
</template>
