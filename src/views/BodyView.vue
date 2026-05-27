<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getAllSets } from '@/db/queries'
import type { WorkoutSet } from '@/db/schema'
import { useExercisesStore } from '@/stores/exercises'
import { useSettingsStore } from '@/stores/settings'
import { aggregateVolume, emptyVolumeMap, type VolumeByGroup } from '@/utils/body-volume'
import {
  DISPLAY_GROUP_LABELS,
  MUSCLE_DISPLAY_GROUPS,
  displayGroupColorVar,
  type MuscleDisplayGroup,
} from '@/utils/muscle-groups'

const router = useRouter()
const exercises = useExercisesStore()
const settings = useSettingsStore()

const windows = [
  { label: 'This week', days: 7 },
  { label: '4 weeks', days: 28 },
  { label: '8 weeks', days: 56 },
]

const windowDays = ref<number>(7)
const sets = ref<WorkoutSet[]>([])
const selected = ref<MuscleDisplayGroup | null>(null)

const volume = computed<VolumeByGroup>(() => {
  if (sets.value.length === 0) return emptyVolumeMap()
  return aggregateVolume(sets.value, exercises.byId)
})

const target = computed(() => settings.weeklySetsTarget * (windowDays.value / 7))

function fillFor(group: MuscleDisplayGroup): { color: string; opacity: number } {
  const value = volume.value[group].sets
  const ratio = target.value > 0 ? Math.min(1.2, value / target.value) : 0
  return {
    color: displayGroupColorVar(group),
    opacity: 0.18 + ratio * 0.82,
  }
}

const fills = computed(() => {
  const result = {} as Record<MuscleDisplayGroup, { color: string; opacity: number }>
  for (const group of MUSCLE_DISPLAY_GROUPS) result[group] = fillFor(group)
  return result
})

function selectGroup(group: MuscleDisplayGroup): void {
  selected.value = selected.value === group ? null : group
}

async function reload(): Promise<void> {
  try {
    const all = await getAllSets()
    const since = Date.now() - windowDays.value * 24 * 60 * 60 * 1000
    sets.value = all.filter((set) => (set.completed_at ?? 0) >= since)
  } catch (cause: unknown) {
    console.error('[hadid] failed to load body sets', cause)
  }
}

onMounted(reload)
watch(windowDays, reload)

function back(): void {
  if (window.history.length > 1) router.back()
  else void router.push('/calendar')
}
</script>

<template>
  <main class="page">
    <header class="page__header body-header">
      <button type="button" class="body-back" aria-label="Back" @click="back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 class="page__title">Body</h1>
    </header>

    <div class="page__body">
      <div class="body-window" role="group" aria-label="Time window">
        <button
          v-for="opt in windows"
          :key="opt.days"
          type="button"
          class="body-window__btn"
          :class="{ 'body-window__btn--active': windowDays === opt.days }"
          @click="windowDays = opt.days"
        >{{ opt.label }}</button>
      </div>

      <svg viewBox="0 0 200 400" class="body-svg" aria-label="Body volume diagram">
        <!-- Head -->
        <ellipse cx="100" cy="32" rx="22" ry="24" fill="var(--color-surface-raised)" stroke="var(--color-border)" stroke-width="1" />
        <!-- Neck -->
        <rect x="92" y="54" width="16" height="10" fill="var(--color-surface-raised)" />

        <!-- Shoulders -->
        <ellipse cx="56" cy="74" rx="20" ry="14" :fill="fills.shoulders.color" :fill-opacity="fills.shoulders.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'shoulders' }" @click="selectGroup('shoulders')" />
        <ellipse cx="144" cy="74" rx="20" ry="14" :fill="fills.shoulders.color" :fill-opacity="fills.shoulders.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'shoulders' }" @click="selectGroup('shoulders')" />

        <!-- Chest -->
        <rect x="64" y="68" width="72" height="46" rx="8" :fill="fills.chest.color" :fill-opacity="fills.chest.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'chest' }" @click="selectGroup('chest')" />

        <!-- Arms (upper) -->
        <rect x="30" y="76" width="20" height="80" rx="6" :fill="fills.arms.color" :fill-opacity="fills.arms.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'arms' }" @click="selectGroup('arms')" />
        <rect x="150" y="76" width="20" height="80" rx="6" :fill="fills.arms.color" :fill-opacity="fills.arms.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'arms' }" @click="selectGroup('arms')" />
        <!-- Forearms -->
        <rect x="30" y="160" width="18" height="60" rx="6" :fill="fills.arms.color" :fill-opacity="fills.arms.opacity * 0.85" class="body-region" @click="selectGroup('arms')" />
        <rect x="152" y="160" width="18" height="60" rx="6" :fill="fills.arms.color" :fill-opacity="fills.arms.opacity * 0.85" class="body-region" @click="selectGroup('arms')" />

        <!-- Core / abs -->
        <rect x="70" y="118" width="60" height="60" rx="6" :fill="fills.core.color" :fill-opacity="fills.core.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'core' }" @click="selectGroup('core')" />

        <!-- Back (drawn under torso as a subtle band so users see the group is counted) -->
        <rect x="60" y="82" width="80" height="44" rx="6" :fill="fills.back.color" :fill-opacity="fills.back.opacity * 0.45" class="body-region" :class="{ 'body-region--selected': selected === 'back' }" @click="selectGroup('back')" />

        <!-- Quads -->
        <rect x="60" y="186" width="34" height="110" rx="6" :fill="fills.legs.color" :fill-opacity="fills.legs.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'legs' }" @click="selectGroup('legs')" />
        <rect x="106" y="186" width="34" height="110" rx="6" :fill="fills.legs.color" :fill-opacity="fills.legs.opacity" class="body-region" :class="{ 'body-region--selected': selected === 'legs' }" @click="selectGroup('legs')" />
        <!-- Calves -->
        <rect x="62" y="300" width="30" height="74" rx="6" :fill="fills.legs.color" :fill-opacity="fills.legs.opacity * 0.85" class="body-region" @click="selectGroup('legs')" />
        <rect x="108" y="300" width="30" height="74" rx="6" :fill="fills.legs.color" :fill-opacity="fills.legs.opacity * 0.85" class="body-region" @click="selectGroup('legs')" />
      </svg>

      <p class="body-note">
        Tap a muscle to highlight it below. Color intensity scales with your weekly target.
      </p>

      <div class="body-stats">
        <button
          v-for="group in MUSCLE_DISPLAY_GROUPS"
          :key="group"
          type="button"
          class="body-stat"
          :class="{ 'body-stat--selected': selected === group }"
          @click="selectGroup(group)"
        >
          <span class="body-stat__dot" :style="{ backgroundColor: displayGroupColorVar(group) }" aria-hidden="true" />
          <span class="body-stat__label">{{ DISPLAY_GROUP_LABELS[group] }}</span>
          <span class="body-stat__count">{{ volume[group].sets }} / {{ Math.round(target) }} sets</span>
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.body-header {
  justify-content: flex-start;
  gap: var(--space-2);
}

.body-back {
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

.body-back:active {
  background-color: var(--color-surface);
}

.body-back svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.body-window {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  margin-bottom: var(--space-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.body-window__btn {
  flex: 1;
  min-height: var(--touch-target-min);
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-dim);
  font-size: var(--text-sm);
  font-weight: 600;
}

.body-window__btn--active {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.body-svg {
  display: block;
  width: 100%;
  max-width: 260px;
  margin: 0 auto;
}

.body-region {
  cursor: pointer;
  transition: fill-opacity var(--transition-fast);
}

.body-region--selected {
  stroke: var(--color-text);
  stroke-width: 1.5;
}

.body-note {
  margin: var(--space-3) 0;
  color: var(--color-text-faint);
  font-size: var(--text-xs);
  text-align: center;
}

.body-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.body-stat {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  text-align: left;
}

.body-stat--selected {
  border-color: var(--color-accent);
}

.body-stat__dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.body-stat__label {
  flex: 1;
  font-weight: 600;
}

.body-stat__count {
  color: var(--color-text-dim);
  font-size: var(--text-sm);
}
</style>
