<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PRBadge from '@/components/PRBadge.vue'
import WorkoutTimeSheet from '@/components/WorkoutTimeSheet.vue'
import type { Workout, WorkoutSet } from '@/db/schema'
import { getSetsByWorkout, getWorkout, updateWorkout } from '@/db/queries'
import { useExercisesStore } from '@/stores/exercises'
import { formatDuration, formatWorkoutDate, localDateOf } from '@/utils/dates'

const route = useRoute()
const router = useRouter()
const exercisesStore = useExercisesStore()

const workout = ref<Workout | null>(null)
const sets = ref<WorkoutSet[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  try {
    const found = await getWorkout(id)
    if (found === undefined || found.deleted_at !== null) {
      error.value = 'Workout not found.'
    } else {
      workout.value = found
      sets.value = await getSetsByWorkout(id)
    }
  } catch (cause: unknown) {
    error.value = 'Could not load this workout.'
    console.error('[hadid] failed to load workout detail', cause)
  } finally {
    loading.value = false
  }
})

/** Logged sets grouped by exercise, in the workout's lineup order. */
const exerciseGroups = computed(() => {
  const current = workout.value
  if (current === null) return []
  return current.exercise_ids
    .map((exerciseId) => ({
      id: exerciseId,
      name: exercisesStore.byId.get(exerciseId)?.name ?? 'Unknown exercise',
      sets: sets.value
        .filter((set) => set.exercise_id === exerciseId)
        .sort((a, b) => a.set_number - b.set_number),
    }))
    .filter((group) => group.sets.length > 0)
})

const prCount = computed(() => sets.value.filter((set) => set.is_pr).length)

const editTimeOpen = ref(false)

async function saveEditedTime(payload: { startedAt: number; endedAt: number }): Promise<void> {
  if (workout.value === null) return
  const next: Workout = {
    ...workout.value,
    started_at: payload.startedAt,
    ended_at: payload.endedAt,
    duration_seconds: Math.max(0, Math.floor((payload.endedAt - payload.startedAt) / 1000)),
    local_date: localDateOf(payload.startedAt),
    updated_at: Date.now(),
  }
  try {
    await updateWorkout(next)
    workout.value = next
  } catch (cause: unknown) {
    console.error('[hadid] failed to update workout time', cause)
  }
  editTimeOpen.value = false
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <button
        type="button"
        class="detail-back"
        aria-label="Back to history"
        @click="router.push('/history')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <h1 class="page__title">
        {{ workout === null ? 'Workout' : formatWorkoutDate(workout.started_at) }}
      </h1>
    </header>

    <div class="page__body">
      <p v-if="error" class="detail__state" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="detail__state">Loading…</p>

      <template v-else-if="workout !== null">
        <div class="detail-stats">
          <div class="detail-stat">
            <span class="detail-stat__value">{{ formatDuration(workout.duration_seconds) }}</span>
            <span class="detail-stat__label">Duration</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat__value">{{ workout.total_volume.toLocaleString() }}</span>
            <span class="detail-stat__label">Volume ({{ workout.weight_unit }})</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat__value">{{ workout.set_count }}</span>
            <span class="detail-stat__label">Sets</span>
          </div>
        </div>

        <button type="button" class="detail-edit-time" @click="editTimeOpen = true">
          Edit time / duration
        </button>

        <p v-if="prCount > 0" class="detail-pr-banner">
          {{ prCount }} new personal {{ prCount === 1 ? 'record' : 'records' }}
        </p>

        <section v-for="group in exerciseGroups" :key="group.id" class="detail-exercise">
          <h2 class="detail-exercise__name">{{ group.name }}</h2>
          <div v-for="(set, index) in group.sets" :key="set.id" class="detail-set">
            <span class="detail-set__num">{{ index + 1 }}</span>
            <span class="detail-set__value">
              {{ set.weight }} {{ set.weight_unit }} × {{ set.reps }}<template
                v-for="(drop, dIdx) in (set.drop_segments ?? [])"
                :key="`${set.id}-d-${dIdx}`"
              >
                <span class="detail-set__drop"> → {{ drop.weight }} × {{ drop.reps }}</span></template>
            </span>
            <PRBadge v-if="set.is_pr" />
          </div>
        </section>

        <p v-if="exerciseGroups.length === 0" class="detail__state">
          No sets were logged in this workout.
        </p>

        <p v-if="workout.notes !== ''" class="detail-notes">{{ workout.notes }}</p>
      </template>
    </div>

    <WorkoutTimeSheet
      v-if="editTimeOpen && workout !== null"
      title="Edit workout time"
      :initial-started-at="workout.started_at"
      :initial-duration-seconds="workout.duration_seconds"
      @close="editTimeOpen = false"
      @confirm="saveEditedTime"
    />
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

.detail__state {
  margin: auto;
  padding: var(--space-6) 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.detail-stats {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.detail-edit-time {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-bottom: var(--space-5);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.detail-edit-time:active {
  background-color: var(--color-surface);
}

.detail-stat {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: var(--space-3) var(--space-2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.detail-stat__value {
  font-size: var(--text-lg);
  font-weight: 700;
}

.detail-stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-exercise {
  margin-bottom: var(--space-4);
}

.detail-exercise__name {
  margin-bottom: var(--space-2);
  font-size: var(--text-base);
  font-weight: 700;
}

.detail-set {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 36px;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.detail-set:last-child {
  border-bottom: none;
}

.detail-set__num {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-faint);
}

.detail-set__value {
  flex: 1;
  font-weight: 600;
}

.detail-set__drop {
  color: var(--color-text-dim);
  font-weight: 500;
}

.detail-pr-banner {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background-color: var(--color-accent);
  border-radius: var(--radius-md);
  color: var(--color-on-accent);
  font-weight: 700;
  text-align: center;
}

.detail-notes {
  margin-top: var(--space-4);
  padding: var(--space-3);
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
}
</style>
