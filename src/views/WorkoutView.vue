<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useExercisesStore } from '@/stores/exercises'
import { useWorkoutsStore } from '@/stores/workouts'
import { formatDuration } from '@/utils/dates'

const router = useRouter()
const workoutsStore = useWorkoutsStore()
const exercisesStore = useExercisesStore()

const elapsedSeconds = ref(0)
const actionError = ref<string | null>(null)
let timerId: number | undefined

function tick(): void {
  const workout = workoutsStore.active
  elapsedSeconds.value =
    workout === null ? 0 : Math.floor((Date.now() - workout.started_at) / 1000)
}

onMounted(() => {
  tick()
  timerId = window.setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timerId !== undefined) window.clearInterval(timerId)
})

const exercises = computed(() => {
  const workout = workoutsStore.active
  if (workout === null) return []
  return workout.exercise_ids.map((id) => ({
    id,
    name: exercisesStore.byId.get(id)?.name ?? 'Unknown exercise',
  }))
})

async function finishWorkout(): Promise<void> {
  actionError.value = null
  try {
    await workoutsStore.finish()
    await router.push('/')
  } catch {
    actionError.value = 'Could not finish the workout. Please try again.'
  }
}

async function discardWorkout(): Promise<void> {
  if (!window.confirm('Discard this workout? Nothing will be saved.')) return
  actionError.value = null
  try {
    await workoutsStore.discard()
    await router.push('/')
  } catch {
    actionError.value = 'Could not discard the workout. Please try again.'
  }
}
</script>

<template>
  <main class="page">
    <template v-if="workoutsStore.active">
      <header class="page__header">
        <span class="workout-timer">{{ formatDuration(elapsedSeconds) }}</span>
        <button type="button" class="workout-finish" @click="finishWorkout">Finish</button>
      </header>

      <div class="page__body">
        <p v-if="actionError" class="workout-error" role="alert">{{ actionError }}</p>

        <ul v-if="exercises.length > 0" class="workout-exercises">
          <li
            v-for="(exercise, index) in exercises"
            :key="`${exercise.id}-${index}`"
            class="workout-exercise"
          >
            {{ exercise.name }}
          </li>
        </ul>
        <p v-else class="page__placeholder">This workout has no exercises yet.</p>

        <button type="button" class="workout-discard" @click="discardWorkout">
          Discard workout
        </button>
      </div>
    </template>

    <template v-else>
      <header class="page__header">
        <h1 class="page__title">Workout</h1>
      </header>
      <div class="page__body">
        <p class="page__placeholder">No active workout. Start one from the Home tab.</p>
      </div>
    </template>
  </main>
</template>

<style scoped>
.workout-timer {
  font-family: var(--font-mono);
  font-size: var(--text-2xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.workout-finish {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-4);
  background-color: var(--color-accent);
  border-radius: var(--radius-full);
  color: var(--color-on-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.workout-finish:active {
  background-color: var(--color-accent-pressed);
}

.workout-error {
  margin-bottom: var(--space-3);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.workout-exercises {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.workout-exercise {
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-weight: 600;
}

.workout-discard {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: auto;
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-weight: 600;
}

.workout-discard:active {
  background-color: var(--color-surface);
}
</style>
