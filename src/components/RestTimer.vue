<script setup lang="ts">
import { computed } from 'vue'

import { useRestTimerStore } from '@/stores/restTimer'

const store = useRestTimerStore()

const display = computed(() => {
  const total = store.remainingSeconds
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
</script>

<template>
  <div v-if="store.active" class="rest-timer" role="status" aria-live="polite">
    <div class="rest-timer__inner">
      <button
        type="button"
        class="rest-timer__btn"
        aria-label="Subtract 15 seconds"
        @click="store.adjust(-15)"
      >−15s</button>
      <div class="rest-timer__time" aria-label="Rest time remaining">{{ display }}</div>
      <button type="button" class="rest-timer__skip" @click="store.skip">Skip</button>
      <button
        type="button"
        class="rest-timer__btn"
        aria-label="Add 15 seconds"
        @click="store.adjust(15)"
      >+15s</button>
    </div>
  </div>
</template>

<style scoped>
.rest-timer {
  position: fixed;
  right: 0;
  bottom: calc(var(--bottom-nav-height) + var(--safe-bottom));
  left: 0;
  z-index: calc(var(--z-bottom-nav) + 1);
  display: flex;
  justify-content: center;
  pointer-events: none;
  padding: var(--space-2);
}

.rest-timer__inner {
  display: flex;
  width: 100%;
  max-width: var(--app-max-width);
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background-color: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.rest-timer__btn,
.rest-timer__skip {
  flex-shrink: 0;
  min-height: 36px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
}

.rest-timer__btn {
  background-color: var(--color-surface);
}

.rest-timer__btn:active {
  background-color: var(--color-border);
}

.rest-timer__skip {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.rest-timer__skip:active {
  background-color: var(--color-accent-pressed);
}

.rest-timer__time {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-lg);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
</style>
