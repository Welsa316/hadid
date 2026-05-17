<script setup lang="ts">
import { computed, ref } from 'vue'

import ExercisePicker from './ExercisePicker.vue'
import ModalSheet from './ModalSheet.vue'
import type { Routine } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import { useRoutinesStore } from '@/stores/routines'

const props = defineProps<{ routine: Routine | null }>()
const emit = defineEmits<{ close: [] }>()

const routinesStore = useRoutinesStore()
const exercisesStore = useExercisesStore()

const isExisting = props.routine !== null

const name = ref(props.routine?.name ?? '')
const exerciseIds = ref<string[]>([...(props.routine?.exercise_ids ?? [])])
const pickerOpen = ref(false)
const saving = ref(false)
const editorError = ref<string | null>(null)

const exerciseRows = computed(() =>
  exerciseIds.value.map((id) => ({
    id,
    name: exercisesStore.byId.get(id)?.name ?? 'Unknown exercise',
  })),
)

const canSave = computed(() => name.value.trim() !== '' && !saving.value)

function removeExercise(index: number): void {
  exerciseIds.value.splice(index, 1)
}

function onPickerConfirm(ids: string[]): void {
  exerciseIds.value = [...exerciseIds.value, ...ids]
  pickerOpen.value = false
}

async function handleSave(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  editorError.value = null
  try {
    if (props.routine === null) {
      await routinesStore.create(name.value.trim(), exerciseIds.value)
    } else {
      await routinesStore.save(props.routine, {
        name: name.value.trim(),
        exercise_ids: exerciseIds.value,
      })
    }
    emit('close')
  } catch (cause: unknown) {
    console.error('[hadid] failed to save routine', cause)
    editorError.value = 'Could not save the routine. Please try again.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(): Promise<void> {
  if (props.routine === null) return
  if (!window.confirm(`Delete "${props.routine.name}"? This cannot be undone.`)) return
  editorError.value = null
  try {
    await routinesStore.remove(props.routine.id)
    emit('close')
  } catch (cause: unknown) {
    console.error('[hadid] failed to delete routine', cause)
    editorError.value = 'Could not delete the routine. Please try again.'
  }
}
</script>

<template>
  <ModalSheet :title="isExisting ? 'Edit routine' : 'New routine'" @close="emit('close')">
    <template #action>
      <button type="button" class="editor-save" :disabled="!canSave" @click="handleSave">
        Save
      </button>
    </template>

    <label class="editor-field">
      <span class="editor-field__label">Routine name</span>
      <input
        v-model="name"
        type="text"
        class="editor-field__input"
        placeholder="e.g. Push Day"
        maxlength="60"
      />
    </label>

    <section class="editor-section">
      <h3 class="editor-section__title">
        Exercises
        <span class="editor-section__count">{{ exerciseRows.length }}</span>
      </h3>

      <ul v-if="exerciseRows.length > 0" class="editor-exercises">
        <li
          v-for="(row, index) in exerciseRows"
          :key="`${row.id}-${index}`"
          class="editor-exercise"
        >
          <span class="editor-exercise__name">{{ row.name }}</span>
          <button
            type="button"
            class="editor-exercise__remove"
            :aria-label="`Remove ${row.name}`"
            @click="removeExercise(index)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </li>
      </ul>
      <p v-else class="editor-empty">No exercises yet — add some below.</p>

      <button type="button" class="editor-add" @click="pickerOpen = true">+ Add exercises</button>
    </section>

    <p v-if="editorError" class="editor-error" role="alert">{{ editorError }}</p>

    <button v-if="isExisting" type="button" class="editor-delete" @click="handleDelete">
      Delete routine
    </button>
  </ModalSheet>

  <ExercisePicker
    v-if="pickerOpen"
    :exclude-ids="exerciseIds"
    @close="pickerOpen = false"
    @confirm="onPickerConfirm"
  />
</template>

<style scoped>
.editor-save {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.editor-save:disabled {
  color: var(--color-text-faint);
}

.editor-save:not(:disabled):active {
  background-color: var(--color-surface-raised);
}

.editor-field {
  display: block;
  margin-bottom: var(--space-5);
}

.editor-field__label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-dim);
}

.editor-field__input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
}

.editor-field__input::placeholder {
  color: var(--color-text-faint);
}

.editor-section__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: var(--text-base);
}

.editor-section__count {
  padding: 1px var(--space-2);
  background-color: var(--color-surface-raised);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-dim);
}

.editor-exercises {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  list-style: none;
}

.editor-exercise {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-target-min);
  padding-left: var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.editor-exercise__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-exercise__remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  color: var(--color-text-dim);
}

.editor-exercise__remove:active {
  color: var(--color-danger);
}

.editor-exercise__remove svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.editor-empty {
  margin-bottom: var(--space-3);
  color: var(--color-text-faint);
  font-size: var(--text-sm);
}

.editor-add {
  width: 100%;
  min-height: var(--touch-target-min);
  background-color: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-accent);
  font-weight: 600;
}

.editor-add:active {
  background-color: var(--color-surface);
}

.editor-error {
  margin-top: var(--space-4);
  color: var(--color-danger);
  font-size: var(--text-sm);
}

.editor-delete {
  width: 100%;
  min-height: var(--touch-target-min);
  margin-top: var(--space-6);
  background-color: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-danger);
  font-weight: 600;
}

.editor-delete:active {
  background-color: var(--color-surface);
}
</style>
