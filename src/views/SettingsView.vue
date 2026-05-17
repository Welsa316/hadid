<script setup lang="ts">
import type { WeightUnit } from '@/db/schema'
import { useSettingsStore } from '@/stores/settings'
import type { Theme } from '@/stores/settings'

const settings = useSettingsStore()

const themeOptions: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]

const unitOptions: ReadonlyArray<{ value: WeightUnit; label: string }> = [
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'kg', label: 'Kilograms (kg)' },
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

      <section class="settings-section">
        <h2 class="settings-section__title">Weight unit</h2>
        <div class="settings-segment" role="group" aria-label="Weight unit">
          <button
            v-for="option in unitOptions"
            :key="option.value"
            type="button"
            class="settings-segment__option"
            :class="{ 'settings-segment__option--active': settings.unit === option.value }"
            :aria-pressed="settings.unit === option.value"
            @click="settings.setUnit(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="settings-note">
          New workouts use this unit. Past workouts keep the unit they were logged in.
        </p>
      </section>

      <section class="settings-section">
        <h2 class="settings-section__title">About</h2>
        <div class="settings-about">
          <p class="settings-about__name">Hadid</p>
          <p class="settings-about__line">Version 0.1.0</p>
          <p class="settings-about__line">An offline-first workout tracker.</p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.settings-section {
  margin-bottom: var(--space-6);
}

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
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
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

.settings-note {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.settings-about {
  padding: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.settings-about__name {
  font-size: var(--text-xl);
  font-weight: 800;
}

.settings-about__line {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-dim);
}
</style>
