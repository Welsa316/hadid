<script setup lang="ts">
import { computed, ref } from 'vue'

import ExerciseCard from '@/components/ExerciseCard.vue'
import type { Equipment } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import {
  DISPLAY_GROUP_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_DISPLAY_GROUPS,
  rollUpMuscle,
} from '@/utils/muscle-groups'
import type { MuscleDisplayGroup } from '@/utils/muscle-groups'

const store = useExercisesStore()

const search = ref('')
const muscleFilter = ref<MuscleDisplayGroup | 'all'>('all')
const equipmentFilter = ref<Equipment | 'all'>('all')

/** Equipment values actually present in the library, for the filter select. */
const equipmentOptions = computed<Equipment[]>(() => {
  const present = new Set<Equipment>()
  for (const exercise of store.all) present.add(exercise.equipment)
  return [...present].sort((a, b) => EQUIPMENT_LABELS[a].localeCompare(EQUIPMENT_LABELS[b]))
})

const filteredExercises = computed(() => {
  const query = search.value.trim().toLowerCase()
  return store.all
    .filter((exercise) => {
      if (query !== '' && !exercise.name.toLowerCase().includes(query)) return false
      if (
        muscleFilter.value !== 'all' &&
        rollUpMuscle(exercise.primary_muscle) !== muscleFilter.value
      ) {
        return false
      }
      if (equipmentFilter.value !== 'all' && exercise.equipment !== equipmentFilter.value) {
        return false
      }
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Exercises</h1>
      <span v-if="store.hydrated" class="exercises__count">{{ filteredExercises.length }}</span>
    </header>

    <p v-if="store.error" class="exercises__state" role="alert">{{ store.error }}</p>

    <p v-else-if="!store.hydrated" class="exercises__state">Loading exercises…</p>

    <template v-else>
      <div class="exercises__filters">
        <input
          v-model="search"
          type="search"
          class="exercises__search"
          placeholder="Search exercises"
          aria-label="Search exercises"
        />

        <div class="chip-row" role="group" aria-label="Filter by muscle group">
          <button
            type="button"
            class="chip"
            :class="{ 'chip--active': muscleFilter === 'all' }"
            :aria-pressed="muscleFilter === 'all'"
            @click="muscleFilter = 'all'"
          >
            All
          </button>
          <button
            v-for="group in MUSCLE_DISPLAY_GROUPS"
            :key="group"
            type="button"
            class="chip"
            :class="{ 'chip--active': muscleFilter === group }"
            :aria-pressed="muscleFilter === group"
            @click="muscleFilter = group"
          >
            {{ DISPLAY_GROUP_LABELS[group] }}
          </button>
        </div>

        <select
          v-model="equipmentFilter"
          class="exercises__equipment"
          aria-label="Filter by equipment"
        >
          <option value="all">All equipment</option>
          <option v-for="eq in equipmentOptions" :key="eq" :value="eq">
            {{ EQUIPMENT_LABELS[eq] }}
          </option>
        </select>
      </div>

      <ul v-if="filteredExercises.length > 0" class="exercises__list">
        <li v-for="exercise in filteredExercises" :key="exercise.id">
          <ExerciseCard :exercise="exercise" />
        </li>
      </ul>
      <p v-else class="exercises__state">No exercises match your filters.</p>
    </template>
  </main>
</template>

<style scoped>
.exercises__count {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-faint);
}

.exercises__state {
  margin: auto;
  padding: var(--space-6) 0;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.exercises__filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.exercises__search,
.exercises__equipment {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.exercises__search::placeholder {
  color: var(--color-text-faint);
}

.chip-row {
  display: flex;
  gap: var(--space-2);
  margin: 0 calc(-1 * var(--space-4));
  padding: var(--space-1) var(--space-4);
  overflow-x: auto;
  scrollbar-width: none;
}

.chip-row::-webkit-scrollbar {
  display: none;
}

.chip {
  flex-shrink: 0;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.chip--active {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.chip:active {
  transform: scale(0.96);
}

.exercises__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}
</style>
