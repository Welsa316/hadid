<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ProgressChart from '@/components/ProgressChart.vue'
import type { WorkoutSet } from '@/db/schema'
import { getCompletedWorkouts, getSetsByExercise } from '@/db/queries'
import { useExercisesStore } from '@/stores/exercises'
import { useSettingsStore } from '@/stores/settings'

type Metric = 'weight' | 'volume' | 'reps'

interface ProgressPoint {
  t: number
  weight: number
  volume: number
  reps: number
}

const route = useRoute()
const router = useRouter()
const exercisesStore = useExercisesStore()
const settingsStore = useSettingsStore()

const exerciseId = typeof route.params.id === 'string' ? route.params.id : ''
const exerciseName = computed(() => exercisesStore.byId.get(exerciseId)?.name ?? 'Exercise')

const points = ref<ProgressPoint[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const metric = ref<Metric>('weight')

const metricOptions: ReadonlyArray<{ value: Metric; label: string }> = [
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'reps', label: 'Reps' },
]

const chartPoints = computed(() => points.value.map((point) => ({ t: point.t, y: point[metric.value] })))
const seriesLabel = computed(() => (metric.value === 'reps' ? 'reps' : settingsStore.unit))

onMounted(async () => {
  try {
    const [workouts, sets] = await Promise.all([
      getCompletedWorkouts(),
      getSetsByExercise(exerciseId),
    ])
    const workoutById = new Map(workouts.map((workout) => [workout.id, workout]))
    const byWorkout = new Map<string, WorkoutSet[]>()
    for (const set of sets) {
      if (!workoutById.has(set.workout_id)) continue
      const group = byWorkout.get(set.workout_id) ?? []
      group.push(set)
      byWorkout.set(set.workout_id, group)
    }
    const built: ProgressPoint[] = []
    for (const [workoutId, group] of byWorkout) {
      const workout = workoutById.get(workoutId)
      if (workout === undefined) continue
      built.push({
        t: Math.floor(workout.started_at / 1000),
        weight: Math.max(...group.map((set) => set.weight)),
        volume: group.reduce((sum, set) => sum + set.weight * set.reps, 0),
        reps: group.reduce((sum, set) => sum + set.reps, 0),
      })
    }
    built.sort((a, b) => a.t - b.t)
    points.value = built
  } catch (cause: unknown) {
    error.value = 'Could not load progress for this exercise.'
    console.error('[hadid] failed to load exercise progress', cause)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="page">
    <header class="page__header">
      <button
        type="button"
        class="detail-back"
        aria-label="Back to exercises"
        @click="router.push('/exercises')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 class="page__title">{{ exerciseName }}</h1>
    </header>

    <div class="page__body">
      <p v-if="error" class="progress__state" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="progress__state">Loading…</p>
      <p v-else-if="points.length === 0" class="progress__state">
        No history yet. Log this exercise in a workout to track your progress.
      </p>

      <template v-else>
        <div class="metric-toggle" role="group" aria-label="Progress metric">
          <button
            v-for="option in metricOptions"
            :key="option.value"
            type="button"
            class="metric-toggle__option"
            :class="{ 'metric-toggle__option--active': metric === option.value }"
            :aria-pressed="metric === option.value"
            @click="metric = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <ProgressChart :points="chartPoints" :series-label="seriesLabel" />

        <p class="progress__count">
          {{ points.length }} {{ points.length === 1 ? 'workout logged' : 'workouts logged' }}
        </p>
      </template>
    </div>
  </main>
</template>

<style scoped>
.detail-back {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  margin-left: calc(-1 * var(--space-2));
  color: var(--color-text);
}

.detail-back:active {
  color: var(--color-accent);
}

.detail-back svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.progress__state {
  margin: auto;
  padding: var(--space-6) 0;
  max-width: 30ch;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.metric-toggle {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  padding: var(--space-1);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.metric-toggle__option {
  flex: 1;
  min-height: var(--touch-target-min);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.metric-toggle__option--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.progress__count {
  margin-top: var(--space-3);
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}
</style>
