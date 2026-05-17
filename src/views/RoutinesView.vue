<script setup lang="ts">
import { ref } from 'vue'

import RoutineCard from '@/components/RoutineCard.vue'
import RoutineEditor from '@/components/RoutineEditor.vue'
import type { Routine } from '@/db/schema'
import { useRoutinesStore } from '@/stores/routines'

const store = useRoutinesStore()

const editorOpen = ref(false)
const editingRoutine = ref<Routine | null>(null)

function openNew(): void {
  editingRoutine.value = null
  editorOpen.value = true
}

function openEdit(routine: Routine): void {
  editingRoutine.value = routine
  editorOpen.value = true
}
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Routines</h1>
      <button type="button" class="routines__new" @click="openNew">+ New</button>
    </header>

    <p v-if="store.error" class="routines__state" role="alert">{{ store.error }}</p>
    <p v-else-if="!store.hydrated" class="routines__state">Loading routines…</p>
    <p v-else-if="store.all.length === 0" class="routines__state">
      No routines yet. Create one to plan your training.
    </p>

    <ul v-else class="routines__list">
      <li v-for="routine in store.all" :key="routine.id">
        <RoutineCard :routine="routine" @open="openEdit(routine)" />
      </li>
    </ul>
  </main>

  <RoutineEditor v-if="editorOpen" :routine="editingRoutine" @close="editorOpen = false" />
</template>

<style scoped>
.routines__new {
  min-height: var(--touch-target-min);
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--color-accent);
  font-size: var(--text-base);
  font-weight: 700;
}

.routines__new:active {
  background-color: var(--color-surface);
}

.routines__state {
  margin: auto;
  padding: var(--space-6) 0;
  max-width: 28ch;
  color: var(--color-text-faint);
  font-size: var(--text-sm);
  text-align: center;
}

.routines__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  list-style: none;
}
</style>
