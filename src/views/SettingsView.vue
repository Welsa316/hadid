<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import type { Theme } from '@/stores/settings'

const settings = useSettingsStore()

const themeOptions: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]
</script>

<template>
  <main class="page">
    <header class="page__header">
      <h1 class="page__title">Settings</h1>
    </header>

    <div class="page__body">
      <section class="settings-section">
        <h2 class="settings-section__title">Appearance</h2>
        <div class="settings-segment" role="group" aria-label="Theme">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="settings-segment__option"
            :class="{ 'settings-segment__option--active': settings.theme === option.value }"
            :aria-pressed="settings.theme === option.value"
            @click="settings.setTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings-section__title {
  margin-bottom: var(--space-3);
  font-size: var(--text-base);
  color: var(--color-text-dim);
}

.settings-segment {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-segment__option {
  flex: 1;
  min-height: var(--touch-target-min);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-base);
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.settings-segment__option--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.settings-segment__option:not(.settings-segment__option--active):active {
  background-color: var(--color-surface-raised);
}
</style>
