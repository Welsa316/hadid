<script setup lang="ts">
import BottomNav from '@/components/BottomNav.vue'
import { useExercisesStore } from '@/stores/exercises'
import { useRoutinesStore } from '@/stores/routines'

// Hydrate core data once at app start. The exercise library seeds the bundled
// library into IndexedDB on first run.
void useExercisesStore().hydrate()
void useRoutinesStore().hydrate()
</script>

<template>
  <RouterView />
  <BottomNav />
</template>
