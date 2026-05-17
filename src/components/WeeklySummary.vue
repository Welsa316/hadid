<script setup lang="ts">
import { computed } from 'vue'

import type { DaySummary } from '@/utils/calendar'
import { WEEKDAY_LABELS, daysBetween, weekDays } from '@/utils/calendar'
import { todayLocalDate } from '@/utils/dates'
import {
  DISPLAY_GROUP_LABELS,
  MUSCLE_DISPLAY_GROUPS,
  displayGroupColorVar,
} from '@/utils/muscle-groups'

const props = defineProps<{ dayByDate: Record<string, DaySummary> }>()
const emit = defineEmits<{ select: [date: string] }>()

const week = weekDays(new Date())

const weekHasWorkout = computed<Record<string, boolean>>(() => {
  const result: Record<string, boolean> = {}
  for (const day of week) {
    const summary = props.dayByDate[day.date]
    result[day.date] = summary !== undefined && summary.workoutIds.length > 0
  }
  return result
})

const tally = computed(() => {
  const today = todayLocalDate()
  return MUSCLE_DISPLAY_GROUPS.map((group) => {
    let weekSets = 0
    for (const day of week) {
      weekSets += props.dayByDate[day.date]?.muscleSets[group] ?? 0
    }
    let lastTrained: string | null = null
    for (const [date, summary] of Object.entries(props.dayByDate)) {
      if ((summary.muscleSets[group] ?? 0) > 0 && (lastTrained === null || date > lastTrained)) {
        lastTrained = date
      }
    }
    const gapDays = lastTrained === null ? null : daysBetween(lastTrained, today)
    return {
      group,
      label: DISPLAY_GROUP_LABELS[group],
      color: displayGroupColorVar(group),
      weekSets,
      isGap: gapDays === null || gapDays >= 7,
      gapDays,
    }
  })
})
</script>

<template>
  <section class="weekly">
    <h2 class="weekly__heading">This week</h2>

    <div class="weekly__strip">
      <button
        v-for="(day, index) in week"
        :key="day.date"
        type="button"
        class="weekly__day"
        :class="{ 'weekly__day--today': day.isToday }"
        :aria-label="day.date"
        @click="emit('select', day.date)"
      >
        <span class="weekly__dow">{{ WEEKDAY_LABELS[index] }}</span>
        <span class="weekly__date">{{ day.dayOfMonth }}</span>
        <span
          class="weekly__dot"
          :class="{ 'weekly__dot--on': weekHasWorkout[day.date] }"
          aria-hidden="true"
        />
      </button>
    </div>

    <ul class="weekly__tally">
      <li v-for="item in tally" :key="item.group" class="weekly__tally-row">
        <span class="weekly__tally-dot" :style="{ backgroundColor: item.color }" aria-hidden="true" />
        <span class="weekly__tally-label">{{ item.label }}</span>
        <span class="weekly__tally-count">{{ item.weekSets }}</span>
        <span v-if="item.isGap" class="weekly__tally-gap">
          {{ item.gapDays === null ? 'not trained' : `${item.gapDays}d ago` }}
        </span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.weekly__heading {
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.weekly__strip {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}

.weekly__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: var(--space-2) 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.weekly__day--today {
  border-color: var(--color-accent);
}

.weekly__day:active {
  background-color: var(--color-surface-raised);
}

.weekly__dow {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-faint);
}

.weekly__date {
  font-size: var(--text-sm);
  font-weight: 600;
}

.weekly__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background-color: var(--color-border);
}

.weekly__dot--on {
  background-color: var(--color-accent);
}

.weekly__tally {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  list-style: none;
}

.weekly__tally-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 28px;
}

.weekly__tally-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.weekly__tally-label {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
}

.weekly__tally-count {
  font-size: var(--text-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.weekly__tally-gap {
  min-width: 64px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-danger);
  text-align: right;
}
</style>
