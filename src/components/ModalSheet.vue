<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="modal-sheet" role="dialog" aria-modal="true" :aria-label="title">
    <header class="modal-sheet__header">
      <button type="button" class="modal-sheet__close" aria-label="Close" @click="emit('close')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <h2 class="modal-sheet__title">{{ title }}</h2>
      <div class="modal-sheet__action">
        <slot name="action" />
      </div>
    </header>
    <div class="modal-sheet__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.modal-sheet {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  flex-direction: column;
  max-width: var(--app-max-width);
  margin-inline: auto;
  background-color: var(--color-bg);
  animation: modal-sheet-in var(--transition-base) ease;
}

@keyframes modal-sheet-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-sheet__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
  padding: calc(var(--safe-top) + var(--space-2)) var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.modal-sheet__close {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border-radius: var(--radius-full);
  color: var(--color-text);
}

.modal-sheet__close:active {
  background-color: var(--color-surface-raised);
}

.modal-sheet__close svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.modal-sheet__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: var(--text-lg);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-sheet__action {
  flex-shrink: 0;
}

.modal-sheet__body {
  flex: 1;
  padding: var(--space-4) calc(var(--safe-right) + var(--space-4))
    calc(var(--safe-bottom) + var(--space-6)) calc(var(--safe-left) + var(--space-4));
  overflow-y: auto;
}
</style>
