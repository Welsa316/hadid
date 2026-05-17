<script setup lang="ts">
import { computed } from 'vue'

import type { Routine } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'

const props = defineProps<{ routine: Routine }>()
const emit = defineEmits<{ open: [] }>()

const exercisesStore = useExercisesStore()

const exerciseCount = computed(() => props.routine.exercises.length)

const preview = computed(() => {
  const names: string[] = []
  for (const routineExercise of props.routine.exercises) {
    const name = exercisesStore.byId.get(routineExercise.exercise_id)?.name
    if (name !== undefined) names.push(name)
    if (names.length === 3) break
  }
  return names.join(' · ')
})
</script>

<template>
  <button type="button" class="routine-card" @click="emit('open')">
    <span class="routine-card__name">{{ routine.name }}</span>
    <span class="routine-card__count">
      {{ exerciseCount }} {{ exerciseCount === 1 ? 'exercise' : 'exercises' }}
    </span>
    <span v-if="preview !== ''" class="routine-card__preview">{{ preview }}</span>
  </button>
</template>

<style scoped>
.routine-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: left;
  transition: background-color var(--transition-fast);
}

.routine-card:active {
  background-color: var(--color-surface-raised);
}

.routine-card__name {
  font-size: var(--text-lg);
  font-weight: 700;
}

.routine-card__count {
  font-size: var(--text-sm);
  color: var(--color-accent);
  font-weight: 600;
}

.routine-card__preview {
  overflow: hidden;
  font-size: var(--text-sm);
  color: var(--color-text-dim);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
