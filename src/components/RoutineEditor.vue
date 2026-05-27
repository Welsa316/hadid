<script setup lang="ts">
import { computed, ref } from 'vue'
import { v7 as uuidv7 } from 'uuid'

import ExercisePicker from './ExercisePicker.vue'
import ModalSheet from './ModalSheet.vue'
import type { Routine, RoutineExercise } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import { useRoutinesStore } from '@/stores/routines'

const props = defineProps<{ routine: Routine | null }>()
const emit = defineEmits<{ close: [] }>()

const routinesStore = useRoutinesStore()
const exercisesStore = useExercisesStore()

const isExisting = props.routine !== null

const SCHEME_PRESETS: ReadonlyArray<{ sets: number; reps: number }> = [
  { sets: 3, reps: 8 },
  { sets: 3, reps: 10 },
  { sets: 3, reps: 12 },
  { sets: 4, reps: 8 },
  { sets: 4, reps: 10 },
  { sets: 5, reps: 5 },
]

const name = ref(props.routine?.name ?? '')
const exercises = ref<RoutineExercise[]>((props.routine?.exercises ?? []).map((entry) => ({ ...entry })))
const pickerOpen = ref(false)
const expandedIndex = ref<number | null>(null)
const saving = ref(false)
const editorError = ref<string | null>(null)

const rows = computed(() =>
  exercises.value.map((entry) => ({
    ...entry,
    name: exercisesStore.byId.get(entry.exercise_id)?.name ?? 'Unknown exercise',
  })),
)

const canSave = computed(() => name.value.trim() !== '' && !saving.value)

function updateExercise(index: number, patch: Partial<RoutineExercise>): void {
  const current = exercises.value[index]
  if (current === undefined) return
  exercises.value[index] = { ...current, ...patch }
}

function removeExercise(index: number): void {
  exercises.value.splice(index, 1)
  expandedIndex.value = null
}

function toggleScheme(index: number): void {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function applyPreset(index: number, sets: number, reps: number): void {
  updateExercise(index, { target_sets: sets, target_reps: reps })
  expandedIndex.value = null
}

function onTargetChange(index: number, field: 'target_sets' | 'target_reps', event: Event): void {
  const input = event.target as HTMLInputElement
  const current = exercises.value[index]
  if (current === undefined) return
  const value = Math.floor(Number(input.value))
  if (!Number.isFinite(value) || value < 1) {
    input.value = String(current[field])
    return
  }
  if (field === 'target_sets') updateExercise(index, { target_sets: Math.min(value, 20) })
  else updateExercise(index, { target_reps: Math.min(value, 99) })
}

function onPickerConfirm(ids: string[]): void {
  exercises.value = [
    ...exercises.value,
    ...ids.map((id) => ({ exercise_id: id, target_sets: 3, target_reps: 10 })),
  ]
  pickerOpen.value = false
}

function clearGroup(index: number): void {
  const current = exercises.value[index]
  if (current === undefined) return
  exercises.value[index] = {
    exercise_id: current.exercise_id,
    target_sets: current.target_sets,
    target_reps: current.target_reps,
  }
}

/** Pairs (or un-pairs) this exercise with the one above it as a superset. */
function toggleSuperset(index: number): void {
  if (index === 0) return
  const current = exercises.value[index]
  const previous = exercises.value[index - 1]
  if (current === undefined || previous === undefined) return

  if (current.group_id !== undefined) {
    const groupId = current.group_id
    clearGroup(index)
    const stillUsed = exercises.value.some(
      (entry, i) => i !== index && entry.group_id === groupId,
    )
    if (!stillUsed) clearGroup(index - 1)
    return
  }

  const groupId = previous.group_id ?? uuidv7()
  if (previous.group_id === undefined) {
    updateExercise(index - 1, { group_id: groupId })
  }
  updateExercise(index, { group_id: groupId })
}

async function handleSave(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  editorError.value = null
  try {
    if (props.routine === null) {
      await routinesStore.create(name.value.trim(), exercises.value)
    } else {
      await routinesStore.save(props.routine, {
        name: name.value.trim(),
        exercises: exercises.value,
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
        <span class="editor-section__count">{{ rows.length }}</span>
      </h3>

      <ul v-if="rows.length > 0" class="editor-exercises">
        <li
          v-for="(row, index) in rows"
          :key="`${row.exercise_id}-${index}`"
          class="editor-exercise"
        >
          <div class="editor-exercise__main">
            <span class="editor-exercise__name">{{ row.name }}</span>
            <button
              type="button"
              class="editor-exercise__scheme"
              :aria-label="`Set scheme for ${row.name}`"
              @click="toggleScheme(index)"
            >
              {{ row.target_sets }} × {{ row.target_reps }}
            </button>
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
          </div>

          <div v-if="expandedIndex === index" class="editor-scheme">
            <div class="editor-scheme__presets">
              <button
                v-for="preset in SCHEME_PRESETS"
                :key="`${preset.sets}x${preset.reps}`"
                type="button"
                class="editor-scheme__preset"
                :class="{
                  'editor-scheme__preset--active':
                    row.target_sets === preset.sets && row.target_reps === preset.reps,
                }"
                @click="applyPreset(index, preset.sets, preset.reps)"
              >
                {{ preset.sets }}×{{ preset.reps }}
              </button>
            </div>
            <div class="editor-scheme__custom">
              <label class="editor-scheme__field">
                <span class="editor-scheme__field-label">Sets</span>
                <input
                  class="editor-scheme__input"
                  type="text"
                  inputmode="numeric"
                  :value="row.target_sets"
                  @change="onTargetChange(index, 'target_sets', $event)"
                />
              </label>
              <label class="editor-scheme__field">
                <span class="editor-scheme__field-label">Reps</span>
                <input
                  class="editor-scheme__input"
                  type="text"
                  inputmode="numeric"
                  :value="row.target_reps"
                  @change="onTargetChange(index, 'target_reps', $event)"
                />
              </label>
            </div>
            <label v-if="index > 0" class="editor-scheme__superset">
              <input
                type="checkbox"
                :checked="row.group_id !== undefined"
                @change="toggleSuperset(index)"
              />
              <span>Superset with previous exercise</span>
            </label>
          </div>
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
    :exclude-ids="exercises.map((entry) => entry.exercise_id)"
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
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.editor-exercise__main {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-target-min);
  padding-left: var(--space-3);
}

.editor-exercise__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-exercise__scheme {
  flex-shrink: 0;
  height: var(--touch-target-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface-raised);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 700;
}

.editor-exercise__scheme:active {
  color: var(--color-accent);
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

.editor-scheme {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.editor-scheme__presets {
  display: flex;
  gap: var(--space-2);
  margin: 0 calc(-1 * var(--space-3)) var(--space-3);
  padding: 0 var(--space-3);
  overflow-x: auto;
  scrollbar-width: none;
}

.editor-scheme__presets::-webkit-scrollbar {
  display: none;
}

.editor-scheme__preset {
  flex-shrink: 0;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 700;
}

.editor-scheme__preset--active {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-on-accent);
}

.editor-scheme__custom {
  display: flex;
  gap: var(--space-3);
}

.editor-scheme__field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.editor-scheme__field-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-faint);
}

.editor-scheme__input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-weight: 600;
}

.editor-scheme__superset {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  cursor: pointer;
}

.editor-scheme__superset input[type='checkbox'] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-accent);
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
