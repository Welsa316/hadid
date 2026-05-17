<script setup lang="ts">
import BottomNav from '@/components/BottomNav.vue'
import { useExercisesStore } from '@/stores/exercises'

// Hydrate the exercise library once at app start (seeds the bundled library
// into IndexedDB on first run).
void useExercisesStore().hydrate()
</script>

<template>
  <RouterView />
  <BottomNav />
</template>
