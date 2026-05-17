<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getLastWorkoutSetsForExercise } from '@/db/queries'
import type { WorkoutSet } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import { useWorkoutsStore } from '@/stores/workouts'

const props = defineProps<{ exerciseId: string }>()

const workoutsStore = useWorkoutsStore()
const exercisesStore = useExercisesStore()

const exerciseName = computed(
  () => exercisesStore.byId.get(props.exerciseId)?.name ?? 'Unknown exercise',
)

const sets = computed(() =>
  workoutsStore.activeSets
    .filter((set) => set.exercise_id === props.exerciseId)
    .sort((a, b) => a.set_number - b.set_number),
)

const lastTimeSets = ref<WorkoutSet[]>([])

onMounted(async () => {
  const workout = workoutsStore.active
  if (workout === null) return
  try {
    lastTimeSets.value = await getLastWorkoutSetsForExercise(props.exerciseId, workout.id)
  } catch (cause: unknown) {
    console.error('[hadid] failed to load last-time sets', cause)
  }
})

const lastTimeLabel = computed(() =>
  lastTimeSets.value.map((set) => `${set.weight}×${set.reps}`).join('  ·  '),
)

function addSet(): void {
  void workoutsStore.addSet(props.exerciseId)
}

function removeSet(setId: string): void {
  void workoutsStore.deleteSet(setId)
}

/** Commits a numeric field edit; invalid input is rejected and restored. */
function commitField(set: WorkoutSet, field: 'weight' | 'reps', event: Event): void {
  const input = event.target as HTMLInputElement
  const value = Number(input.value)
  if (Number.isFinite(value) && value >= 0) {
    const clean = field === 'reps' ? Math.floor(value) : value
    void workoutsStore.editSet({ ...set, [field]: clean })
  } else {
    input.value = String(set[field])
  }
}
</script>

<template>
  <section class="set-logger">
    <div class="set-logger__header">
      <h3 class="set-logger__name">{{ exerciseName }}</h3>
      <p v-if="lastTimeLabel !== ''" class="set-logger__last">Last time: {{ lastTimeLabel }}</p>
    </div>

    <div v-if="sets.length > 0" class="set-logger__table">
      <div class="set-logger__head">
        <span>Set</span>
        <span>Weight</span>
        <span>Reps</span>
        <span aria-hidden="true"></span>
      </div>
      <div v-for="(set, index) in sets" :key="set.id" class="set-logger__row">
        <span class="set-logger__num">{{ index + 1 }}</span>
        <input
          class="set-logger__input"
          type="text"
          inputmode="decimal"
          :value="set.weight"
          :aria-label="`Set ${index + 1} weight`"
          @change="commitField(set, 'weight', $event)"
        />
        <input
          class="set-logger__input"
          type="text"
          inputmode="numeric"
          :value="set.reps"
          :aria-label="`Set ${index + 1} reps`"
          @change="commitField(set, 'reps', $event)"
        />
        <button
          type="button"
          class="set-logger__remove"
          :aria-label="`Remove set ${index + 1}`"
          @click="removeSet(set.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>

    <button type="button" class="set-logger__add" @click="addSet">+ Add set</button>
  </section>
</template>

<style scoped>
.set-logger {
  margin-bottom: var(--space-3);
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.set-logger__header {
  margin-bottom: var(--space-3);
}

.set-logger__name {
  font-size: var(--text-lg);
  font-weight: 700;
}

.set-logger__last {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.set-logger__head,
.set-logger__row {
  display: grid;
  grid-template-columns: 28px 1fr 1fr var(--touch-target-min);
  gap: var(--space-2);
  align-items: center;
}

.set-logger__head {
  margin-bottom: var(--space-1);
  padding: 0 var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.set-logger__row {
  margin-bottom: var(--space-2);
}

.set-logger__num {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-dim);
  text-align: center;
}

.set-logger__input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-2);
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: 600;
  text-align: center;
}

.set-logger__remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  color: var(--color-text-faint);
}

.set-logger__remove:active {
  color: var(--color-danger);
}

.set-logger__remove svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.set-logger__add {
  width: 100%;
  min-height: var(--touch-target-min);
  background-color: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.set-logger__add:active {
  background-color: var(--color-surface-raised);
}
</style>
