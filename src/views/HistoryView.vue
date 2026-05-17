<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import WorkoutSummary from '@/components/WorkoutSummary.vue'
import type { Workout } from '@/db/schema'
import { getCompletedWorkouts } from '@/db/queries'

const router = useRouter()

const workouts = ref<Workout[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    workouts.value = await getCompletedWorkouts()
  } catch (cause: unknown) {
    error.value = 'Could not load your workout history.'
    console.error('[hadid] failed to load history', cause)
  } finally {
    loading.value = false
  }
})

function openWorkout(id: string): void {
  void router.push(`/history/${id}`)
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">History</h1>
    </header>

    <div class="page__body">
      <p v-if="error" class="history__state" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="history__state">Loading history…</p>
      <p v-else-if="workouts.length === 0" class="history__state">
        No workouts yet. Finished workouts will appear here.
      </p>
      <ul v-else class="history__list">
        <li v-for="workout in workouts" :key="workout.id">
          <WorkoutSummary :workout="workout" @open="openWorkout(workout.id)" />
        </li>
      </ul>
    </div>
  </main>
</template>

<style scoped>
.history__state {
  margin: auto;
  padding: var(--space-6) 0;
  max-width: 28ch;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.history__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}
</style>
