<script setup lang="ts">
import { computed, ref } from 'vue'

import ModalSheet from './ModalSheet.vue'
import type { Exercise } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  displayGroupColorVar,
  rollUpMuscle,
} from '@/utils/muscle-groups'

const props = defineProps<{ excludeIds: string[] }>()
const emit = defineEmits<{ close: []; confirm: [ids: string[]] }>()

const exercisesStore = useExercisesStore()
const search = ref('')
const selectedIds = ref<Set<string>>(new Set())

const available = computed(() => {
  const excluded = new Set(props.excludeIds)
  const query = search.value.trim().toLowerCase()
  return exercisesStore.all
    .filter((exercise) => !excluded.has(exercise.id))
    .filter((exercise) => query === '' || exercise.name.toLowerCase().includes(query))
    .sort((a, b) => a.name.localeCompare(b.name))
})

function dotColor(exercise: Exercise): string {
  const group = rollUpMuscle(exercise.primary_muscle)
  return group === null ? 'var(--color-text-faint)' : displayGroupColorVar(group)
}

function toggle(id: string): void {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

function confirmSelection(): void {
  if (selectedIds.value.size === 0) return
  emit('confirm', [...selectedIds.value])
}
</script>

<template>
  <ModalSheet title="Add exercises" @close="emit('close')">
    <template #action>
      <button
        type="button"
        class="picker-confirm"
        :disabled="selectedIds.size === 0"
        @click="confirmSelection"
      >
        Add{{ selectedIds.size > 0 ? ` (${selectedIds.size})` : '' }}
      </button>
    </template>

    <input
      v-model="search"
      type="search"
      class="picker-search"
      placeholder="Search exercises"
      aria-label="Search exercises"
    />

    <ul v-if="available.length > 0" class="picker-list">
      <li v-for="exercise in available" :key="exercise.id">
        <button
          type="button"
          class="picker-row"
          :class="{ 'picker-row--selected': selectedIds.has(exercise.id) }"
          :aria-pressed="selectedIds.has(exercise.id)"
          @click="toggle(exercise.id)"
        >
          <span
            class="picker-row__dot"
            :style="{ backgroundColor: dotColor(exercise) }"
            aria-hidden="true"
          />
          <span class="picker-row__text">
            <span class="picker-row__name">{{ exercise.name }}</span>
            <span class="picker-row__meta">
              {{ MUSCLE_LABELS[exercise.primary_muscle] }} ·
              {{ EQUIPMENT_LABELS[exercise.equipment] }}
            </span>
          </span>
          <svg class="picker-row__check" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </button>
      </li>
    </ul>
    <p v-else class="picker-empty">No exercises match your search.</p>
  </ModalSheet>
</template>

<style scoped>
.picker-confirm {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.picker-confirm:disabled {
  color: var(--color-text-faint);
}

.picker-confirm:not(:disabled):active {
  background-color: var(--color-surface-raised);
}

.picker-search {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-bottom: var(--space-3);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.picker-search::placeholder {
  color: var(--color-text-faint);
}

.picker-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--touch-target-min);
  padding: var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: left;
  transition: border-color var(--transition-fast);
}

.picker-row--selected {
  border-color: var(--color-accent);
}

.picker-row:active {
  background-color: var(--color-surface-raised);
}

.picker-row__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}

.picker-row__text {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.picker-row__name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-row__meta {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}

.picker-row__check {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--color-accent);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0;
}

.picker-row--selected .picker-row__check {
  opacity: 1;
}

.picker-empty {
  margin-top: var(--space-6);
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}
</style>
