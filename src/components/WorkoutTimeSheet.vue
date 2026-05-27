<script setup lang="ts">
import { ref } from 'vue'

import ModalSheet from './ModalSheet.vue'

const props = defineProps<{
  title: string
  initialStartedAt: number
  initialDurationSeconds: number
}>()
const emit = defineEmits<{
  close: []
  confirm: [{ startedAt: number; endedAt: number }]
}>()

function toInputValue(epoch: number): string {
  const date = new Date(epoch)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

const dateInput = ref(toInputValue(props.initialStartedAt))
const durationMinutes = ref(Math.max(1, Math.round(props.initialDurationSeconds / 60)))

function commit(): void {
  const parsed = new Date(dateInput.value)
  if (Number.isNaN(parsed.getTime())) return
  const startedAt = parsed.getTime()
  const minutes = Number(durationMinutes.value)
  const safeMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : 60
  const endedAt = startedAt + safeMinutes * 60 * 1000
  emit('confirm', { startedAt, endedAt })
}
</script>

<template>
  <ModalSheet :title="title" @close="emit('close')">
    <template #action>
      <button type="button" class="wts-save" @click="commit">Save</button>
    </template>

    <label class="wts-field">
      <span class="wts-label">When</span>
      <input v-model="dateInput" type="datetime-local" class="wts-input" />
    </label>

    <label class="wts-field">
      <span class="wts-label">Duration (minutes)</span>
      <input
        v-model.number="durationMinutes"
        type="number"
        inputmode="numeric"
        min="1"
        max="600"
        class="wts-input"
      />
    </label>
  </ModalSheet>
</template>

<style scoped>
.wts-save {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  color: var(--color-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.wts-field {
  display: block;
  margin-top: var(--space-4);
}

.wts-label {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.wts-input {
  width: 100%;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: max(1rem, 16px);
}
</style>
