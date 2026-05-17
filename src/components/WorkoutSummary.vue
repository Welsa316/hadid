<script setup lang="ts">
import type { Workout } from '@/db/schema'
import { formatDurationShort, formatWorkoutDate } from '@/utils/dates'

defineProps<{ workout: Workout }>()
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <button type="button" class="workout-summary" @click="emit('open')">
    <span class="workout-summary__date">{{ formatWorkoutDate(workout.started_at) }}</span>
    <span class="workout-summary__stats">
      {{ formatDurationShort(workout.duration_seconds) }} ·
      {{ workout.exercise_count }}
      {{ workout.exercise_count === 1 ? 'exercise' : 'exercises' }} ·
      {{ workout.total_volume.toLocaleString() }} {{ workout.weight_unit }}
    </span>
  </button>
</template>

<style scoped>
.workout-summary {
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

.workout-summary:active {
  background-color: var(--color-surface-raised);
}

.workout-summary__date {
  font-size: var(--text-lg);
  font-weight: 700;
}

.workout-summary__stats {
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}
</style>
