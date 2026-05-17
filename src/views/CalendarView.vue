<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import CalendarGrid from '@/components/CalendarGrid.vue'
import WeeklySummary from '@/components/WeeklySummary.vue'
import WorkoutSummary from '@/components/WorkoutSummary.vue'
import type { Workout, WorkoutSet } from '@/db/schema'
import { getAllSets, getCompletedWorkouts } from '@/db/queries'
import { useExercisesStore } from '@/stores/exercises'
import type { DaySummary } from '@/utils/calendar'
import { monthGrid, monthLabel } from '@/utils/calendar'
import { rollUpMuscle } from '@/utils/muscle-groups'

type ViewMode = 'grid' | 'list'

const router = useRouter()
const exercisesStore = useExercisesStore()

const loading = ref(true)
const error = ref<string | null>(null)
const dayByDate = ref<Record<string, DaySummary>>({})
const workouts = ref<Workout[]>([])

const viewMode = ref<ViewMode>('grid')
const today = new Date()
const displayYear = ref(today.getFullYear())
const displayMonth = ref(today.getMonth())

const gridDays = computed(() => monthGrid(displayYear.value, displayMonth.value))
const monthHeading = computed(() => monthLabel(displayYear.value, displayMonth.value))

onMounted(async () => {
  try {
    await exercisesStore.hydrate()
    const [completed, allSets] = await Promise.all([getCompletedWorkouts(), getAllSets()])
    workouts.value = completed

    const setsByWorkout: Record<string, WorkoutSet[]> = {}
    for (const set of allSets) {
      ;(setsByWorkout[set.workout_id] ??= []).push(set)
    }

    const summaries: Record<string, DaySummary> = {}
    for (const workout of completed) {
      const day = (summaries[workout.local_date] ??= { workoutIds: [], muscleSets: {} })
      day.workoutIds.push(workout.id)
      for (const set of setsByWorkout[workout.id] ?? []) {
        const exercise = exercisesStore.byId.get(set.exercise_id)
        if (exercise === undefined) continue
        const group = rollUpMuscle(exercise.primary_muscle)
        if (group === null) continue
        day.muscleSets[group] = (day.muscleSets[group] ?? 0) + 1
      }
    }
    dayByDate.value = summaries
  } catch (cause: unknown) {
    error.value = 'Could not load your calendar.'
    console.error('[hadid] failed to load calendar', cause)
  } finally {
    loading.value = false
  }
})

function changeMonth(delta: number): void {
  const shifted = new Date(displayYear.value, displayMonth.value + delta, 1)
  displayYear.value = shifted.getFullYear()
  displayMonth.value = shifted.getMonth()
}

function selectDay(date: string): void {
  const firstWorkout = dayByDate.value[date]?.workoutIds[0]
  void router.push(firstWorkout === undefined ? '/' : `/history/${firstWorkout}`)
}

function openWorkout(id: string): void {
  void router.push(`/history/${id}`)
}

// A horizontal swipe across the grid switches month.
let touchStartX = 0
let touchStartY = 0
function onTouchStart(event: TouchEvent): void {
  const touch = event.changedTouches[0]
  touchStartX = touch?.clientX ?? 0
  touchStartY = touch?.clientY ?? 0
}
function onTouchEnd(event: TouchEvent): void {
  const touch = event.changedTouches[0]
  const deltaX = (touch?.clientX ?? 0) - touchStartX
  const deltaY = (touch?.clientY ?? 0) - touchStartY
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
    changeMonth(deltaX < 0 ? 1 : -1)
  }
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Calendar</h1>
      <div class="cal-toggle" role="group" aria-label="Calendar view">
        <button
          type="button"
          class="cal-toggle__btn"
          :class="{ 'cal-toggle__btn--active': viewMode === 'grid' }"
          :aria-pressed="viewMode === 'grid'"
          @click="viewMode = 'grid'"
        >
          Grid
        </button>
        <button
          type="button"
          class="cal-toggle__btn"
          :class="{ 'cal-toggle__btn--active': viewMode === 'list' }"
          :aria-pressed="viewMode === 'list'"
          @click="viewMode = 'list'"
        >
          List
        </button>
      </div>
    </header>

    <div class="page__body">
      <p v-if="error" class="cal__state" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="cal__state">Loading calendar…</p>

      <template v-else>
        <WeeklySummary :day-by-date="dayByDate" @select="selectDay" />

        <div class="cal__divider"></div>

        <template v-if="viewMode === 'grid'">
          <div class="cal-month">
            <button
              type="button"
              class="cal-month__nav"
              aria-label="Previous month"
              @click="changeMonth(-1)"
            >
              ‹
            </button>
            <span class="cal-month__label">{{ monthHeading }}</span>
            <button
              type="button"
              class="cal-month__nav"
              aria-label="Next month"
              @click="changeMonth(1)"
            >
              ›
            </button>
          </div>
          <div @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
            <CalendarGrid :days="gridDays" :day-by-date="dayByDate" @select="selectDay" />
          </div>
        </template>

        <template v-else>
          <p v-if="workouts.length === 0" class="cal__state">No workouts logged yet.</p>
          <ul v-else class="cal-list">
            <li v-for="workout in workouts" :key="workout.id">
              <WorkoutSummary :workout="workout" @open="openWorkout(workout.id)" />
            </li>
          </ul>
        </template>
      </template>
    </div>
  </main>
</template>

<style scoped>
.cal-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.cal-toggle__btn {
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.cal-toggle__btn--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.cal__state {
  margin: auto;
  padding: var(--space-6) 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.cal__divider {
  height: 1px;
  margin: var(--space-4) 0;
  background-color: var(--color-border);
}

.cal-month {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.cal-month__nav {
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--text-2xl);
  line-height: 1;
}

.cal-month__nav:active {
  background-color: var(--color-surface);
}

.cal-month__label {
  font-size: var(--text-base);
  font-weight: 700;
}

.cal-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}
</style>
