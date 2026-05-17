<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import BrandLogo from '@/components/BrandLogo.vue'
import RoutineCard from '@/components/RoutineCard.vue'
import type { Routine } from '@/db/schema'
import { useRoutinesStore } from '@/stores/routines'
import { useWorkoutsStore } from '@/stores/workouts'

const router = useRouter()
const routinesStore = useRoutinesStore()
const workoutsStore = useWorkoutsStore()

const starting = ref(false)
const startError = ref<string | null>(null)

async function startWorkout(routine: Routine | null): Promise<void> {
  if (starting.value) return
  starting.value = true
  startError.value = null
  try {
    await workoutsStore.start(routine)
    await router.push('/workout')
  } catch {
    startError.value = 'Could not start the workout. Please try again.'
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="home-brand"><BrandLogo /></h1>
    </header>

    <div class="page__body">
      <button
        v-if="workoutsStore.active"
        type="button"
        class="resume-card"
        @click="router.push('/workout')"
      >
        <span class="resume-card__label">Workout in progress</span>
        <span class="resume-card__action">Resume</span>
      </button>

      <template v-else>
        <button
          type="button"
          class="start-button"
          :disabled="starting"
          @click="startWorkout(null)"
        >
          Start Empty Workout
        </button>

        <p v-if="startError" class="home-error" role="alert">{{ startError }}</p>

        <section class="home-section">
          <h2 class="home-section__title">Start from a routine</h2>
          <p v-if="!routinesStore.hydrated" class="home-hint">Loading routines…</p>
          <p v-else-if="routinesStore.all.length === 0" class="home-hint">
            No routines yet — create one in the Routines tab.
          </p>
          <ul v-else class="home-routines">
            <li v-for="routine in routinesStore.all" :key="routine.id">
              <RoutineCard :routine="routine" @open="startWorkout(routine)" />
            </li>
          </ul>
        </section>
      </template>
    </div>
  </main>
</template>

<style scoped>
.home-brand {
  display: flex;
}

.resume-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-4);
  background-color: var(--color-accent);
  border-radius: var(--radius-lg);
  color: var(--color-on-accent);
}

.resume-card:active {
  background-color: var(--color-accent-pressed);
}

.resume-card__label {
  font-size: var(--text-lg);
  font-weight: 700;
}

.resume-card__action {
  font-size: var(--text-sm);
  font-weight: 700;
}

.start-button {
  width: 100%;
  min-height: 56px;
  margin-bottom: var(--space-6);
  background-color: var(--color-accent);
  border-radius: var(--radius-lg);
  color: var(--color-on-accent);
  font-size: var(--text-lg);
  font-weight: 700;
}

.start-button:active {
  background-color: var(--color-accent-pressed);
}

.start-button:disabled {
  opacity: 0.6;
}

.home-error {
  margin-bottom: var(--space-4);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.home-section__title {
  margin-bottom: var(--space-3);
  font-size: var(--text-base);
  color: var(--color-text-dim);
}

.home-hint {
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.home-routines {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  list-style: none;
}
</style>
