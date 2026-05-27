<script setup lang="ts">
import { useRouter } from 'vue-router'

import ChangelogList from '@/components/ChangelogList.vue'
import { CHANGELOG } from '@/data/changelog'

const router = useRouter()

function back(): void {
  if (window.history.length > 1) router.back()
  else void router.push('/settings')
}
</script>

<template>
  <main class="page">
    <header class="page__header changelog-page__header">
      <button
        type="button"
        class="changelog-page__back"
        aria-label="Back to Settings"
        @click="back"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 class="page__title">What's new</h1>
    </header>
    <div class="page__body">
      <ChangelogList :entries="CHANGELOG" />
    </div>
  </main>
</template>

<style scoped>
.changelog-page__header {
  justify-content: flex-start;
  gap: var(--space-2);
}

.changelog-page__back {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  margin-left: calc(-1 * var(--space-2));
  border-radius: var(--radius-full);
  color: var(--color-text);
}

.changelog-page__back:active {
  background-color: var(--color-surface);
}

.changelog-page__back svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
