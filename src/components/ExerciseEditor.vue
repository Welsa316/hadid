<script setup lang="ts">
import { ref } from 'vue'
import { v7 as uuidv7 } from 'uuid'

import ModalSheet from './ModalSheet.vue'
import type { Equipment, Exercise, ExerciseType, MuscleGroup } from '@/db/schema'

const props = defineProps<{ existing?: Exercise }>()
const emit = defineEmits<{ close: []; save: [Exercise] }>()

const PRIMARY_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
]

const EQUIPMENT_OPTIONS: Equipment[] = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
  'band',
  'bodyweight',
  'ez_bar',
  'smith_machine',
  'other',
]

const TYPE_OPTIONS: ExerciseType[] = ['compound', 'isolation', 'bodyweight']

const name = ref(props.existing?.name ?? '')
const primaryMuscle = ref<MuscleGroup>(props.existing?.primary_muscle ?? 'chest')
const equipment = ref<Equipment>(props.existing?.equipment ?? 'barbell')
const exerciseType = ref<ExerciseType>(props.existing?.type ?? 'compound')

function commit(): void {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) return
  const now = Date.now()
  if (props.existing !== undefined) {
    emit('save', {
      ...props.existing,
      name: trimmed,
      primary_muscle: primaryMuscle.value,
      equipment: equipment.value,
      type: exerciseType.value,
      updated_at: now,
    })
    return
  }
  emit('save', {
    id: uuidv7(),
    name: trimmed,
    primary_muscle: primaryMuscle.value,
    secondary_muscles: [],
    equipment: equipment.value,
    type: exerciseType.value,
    is_custom: true,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    last_synced_at: null,
    _v: 1,
  })
}
</script>

<template>
  <ModalSheet :title="existing !== undefined ? 'Edit exercise' : 'New exercise'" @close="emit('close')">
    <template #action>
      <button type="button" class="ee-save" :disabled="name.trim().length === 0" @click="commit">
        Save
      </button>
    </template>

    <label class="ee-field">
      <span class="ee-label">Name</span>
      <input v-model="name" type="text" class="ee-input" placeholder="e.g. Hammer Strength Row" />
    </label>

    <label class="ee-field">
      <span class="ee-label">Primary muscle</span>
      <select v-model="primaryMuscle" class="ee-input">
        <option v-for="muscle in PRIMARY_MUSCLES" :key="muscle" :value="muscle">
          {{ muscle.replace(/_/g, ' ') }}
        </option>
      </select>
    </label>

    <label class="ee-field">
      <span class="ee-label">Equipment</span>
      <select v-model="equipment" class="ee-input">
        <option v-for="eq in EQUIPMENT_OPTIONS" :key="eq" :value="eq">
          {{ eq.replace(/_/g, ' ') }}
        </option>
      </select>
    </label>

    <label class="ee-field">
      <span class="ee-label">Movement type</span>
      <select v-model="exerciseType" class="ee-input">
        <option v-for="type in TYPE_OPTIONS" :key="type" :value="type">{{ type }}</option>
      </select>
    </label>

    <p class="ee-note">Custom exercises log weight × reps and feed history, PRs, charts, and the body diagram just like the built-in ones.</p>
  </ModalSheet>
</template>

<style scoped>
.ee-save {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  color: var(--color-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.ee-save:disabled {
  color: var(--color-text-faint);
}

.ee-field {
  display: block;
  margin-top: var(--space-4);
}

.ee-label {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.ee-input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: max(1rem, 16px);
  text-transform: capitalize;
}

.ee-note {
  margin-top: var(--space-4);
  color: var(--color-text-faint);
  font-size: var(--text-xs);
}
</style>
