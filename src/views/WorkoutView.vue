<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ExercisePicker from '@/components/ExercisePicker.vue'
import SetLogger from '@/components/SetLogger.vue'
import { useWorkoutsStore } from '@/stores/workouts'
import { formatDuration } from '@/utils/dates'

const router = useRouter()
const workoutsStore = useWorkoutsStore()

const elapsedSeconds = ref(0)
const actionError = ref<string | null>(null)
const pickerOpen = ref(false)
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

const exerciseIds = computed(() => workoutsStore.active?.exercise_ids ?? [])

function onPickerConfirm(ids: string[]): void {
  void workoutsStore.addExercises(ids)
  pickerOpen.value = false
}

async function finishWorkout(): Promise<void> {
  actionError.value = null
  try {
    const finishedId = await workoutsStore.finish()
    await router.push(finishedId === null ? '/' : `/history/${finishedId}`)
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

        <SetLogger
          v-for="(id, index) in exerciseIds"
          :key="`${id}-${index}`"
          :exercise-id="id"
        />

        <p v-if="exerciseIds.length === 0" class="workout-hint">
          No exercises yet. Add some to start logging sets.
        </p>

        <button type="button" class="workout-add" @click="pickerOpen = true">
          + Add exercise
        </button>

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

  <ExercisePicker
    v-if="pickerOpen"
    :exclude-ids="exerciseIds"
    @close="pickerOpen = false"
    @confirm="onPickerConfirm"
  />
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

.workout-hint {
  margin: var(--space-6) 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.workout-add {
  width: 100%;
  min-height: var(--touch-target-min);
  background-color: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 700;
}

.workout-add:active {
  background-color: var(--color-surface);
}

.workout-discard {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-5);
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
