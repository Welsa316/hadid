<script setup lang="ts">
import { computed } from 'vue'

import type { Exercise } from '@/db/schema'
import { EQUIPMENT_LABELS, MUSCLE_LABELS, displayGroupColorVar, rollUpMuscle } from '@/utils/muscle-groups'

const props = defineProps<{ exercise: Exercise }>()

const dotColor = computed(() => {
  const group = rollUpMuscle(props.exercise.primary_muscle)
  return group === null ? 'var(--color-text-faint)' : displayGroupColorVar(group)
})
</script>

<template>
  <article class="exercise-card">
    <span class="exercise-card__dot" :style="{ backgroundColor: dotColor }" aria-hidden="true" />
    <div class="exercise-card__text">
      <h3 class="exercise-card__name">{{ exercise.name }}</h3>
      <p class="exercise-card__meta">
        {{ MUSCLE_LABELS[exercise.primary_muscle] }} ·
        {{ EQUIPMENT_LABELS[exercise.equipment] }}
      </p>
    </div>
  </article>
</template>

<style scoped>
.exercise-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-target-min);
  padding: var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.exercise-card:active {
  background-color: var(--color-surface-raised);
}

.exercise-card__dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}

.exercise-card__text {
  min-width: 0;
}

.exercise-card__name {
  overflow: hidden;
  font-size: var(--text-base);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exercise-card__meta {
  margin-top: 2px;
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}
</style>
