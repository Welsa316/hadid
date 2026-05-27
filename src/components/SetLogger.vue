<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import PlateCalculator from '@/components/PlateCalculator.vue'
import { getLastWorkoutSetsForExercise } from '@/db/queries'
import type { WorkoutSet } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import { useGymStore } from '@/stores/gym'
import { useRoutinesStore } from '@/stores/routines'
import { useSettingsStore } from '@/stores/settings'
import { useWorkoutsStore } from '@/stores/workouts'
import { findSubstitutes, stressedBy } from '@/utils/injury-check'
import { suggestNextSet } from '@/utils/suggestions'

const props = defineProps<{ exerciseId: string }>()

const calcOpen = ref(false)

const workoutsStore = useWorkoutsStore()
const exercisesStore = useExercisesStore()
const routinesStore = useRoutinesStore()
const gymStore = useGymStore()
const settingsStore = useSettingsStore()

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

const targetReps = computed<number>(() => {
  const workout = workoutsStore.active
  if (workout?.routine_id === null || workout?.routine_id === undefined) {
    return lastTimeSets.value[0]?.reps ?? 0
  }
  const routine = routinesStore.all.find((r) => r.id === workout.routine_id)
  const entry = routine?.exercises.find((e) => e.exercise_id === props.exerciseId)
  return entry?.target_reps ?? lastTimeSets.value[0]?.reps ?? 0
})

const suggestion = computed(() => {
  const exercise = exercisesStore.byId.get(props.exerciseId)
  if (exercise === undefined) return null
  const unit = gymStore.active?.unit ?? settingsStore.unit
  return suggestNextSet(
    lastTimeSets.value,
    targetReps.value,
    exercise.type,
    unit,
    gymStore.active,
  )
})

const lastSummary = computed(() => {
  const first = lastTimeSets.value[0]
  return first === undefined ? null : `${first.weight}×${first.reps}`
})

const stressedInjuries = computed(() => {
  const exercise = exercisesStore.byId.get(props.exerciseId)
  if (exercise === undefined) return []
  return stressedBy(exercise, settingsStore.activeInjuries)
})

const substitutes = computed(() => {
  if (stressedInjuries.value.length === 0) return []
  const exercise = exercisesStore.byId.get(props.exerciseId)
  if (exercise === undefined) return []
  return findSubstitutes(exercise, exercisesStore.all, settingsStore.activeInjuries)
})

const latestWeight = computed(() => sets.value.at(-1)?.weight ?? 0)

function addSet(): void {
  void workoutsStore.addSet(props.exerciseId)
}

function openCalculator(): void {
  calcOpen.value = true
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
      <p v-if="suggestion !== null || lastSummary !== null" class="set-logger__hint">
        <span v-if="suggestion !== null" class="set-logger__suggested">
          Suggested {{ suggestion.weight }}×{{ suggestion.reps }}
        </span>
        <span v-if="suggestion !== null && lastSummary !== null" aria-hidden="true">·</span>
        <span v-if="lastSummary !== null" class="set-logger__last">Last {{ lastSummary }}</span>
      </p>
    </div>

    <div v-if="stressedInjuries.length > 0" class="set-logger__warning" role="alert">
      <p class="set-logger__warning-text">
        May aggravate your {{ stressedInjuries.join(', ').replace(/_/g, ' ') }}.
      </p>
      <p v-if="substitutes.length > 0" class="set-logger__warning-subs">
        Try instead: {{ substitutes.map((e) => e.name).join(', ') }}.
      </p>
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

    <div class="set-logger__actions">
      <button type="button" class="set-logger__add" @click="addSet">+ Add set</button>
      <button type="button" class="set-logger__plates" @click="openCalculator">
        Calculate plates
      </button>
    </div>
  </section>

  <PlateCalculator
    v-if="calcOpen"
    :exercise-id="exerciseId"
    :initial-weight="latestWeight"
    @close="calcOpen = false"
  />
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

.set-logger__hint {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.set-logger__suggested {
  color: var(--color-accent);
  font-weight: 600;
}

.set-logger__last {
  color: var(--color-text-faint);
}

.set-logger__warning {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
}

.set-logger__warning-text {
  color: var(--color-danger);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: capitalize;
}

.set-logger__warning-subs {
  margin-top: var(--space-1);
  color: var(--color-text-dim);
  font-size: var(--text-xs);
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

.set-logger__actions {
  display: flex;
  gap: var(--space-2);
}

.set-logger__add,
.set-logger__plates {
  flex: 1;
  min-height: var(--touch-target-min);
  background-color: transparent;
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.set-logger__add {
  border: 1px dashed var(--color-border);
}

.set-logger__plates {
  border: 1px solid var(--color-border);
}

.set-logger__add:active,
.set-logger__plates:active {
  background-color: var(--color-surface-raised);
}
</style>
