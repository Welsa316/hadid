<script setup lang="ts">
import type { CalendarDay, DaySummary } from '@/utils/calendar'
import { WEEKDAY_LABELS } from '@/utils/calendar'
import { displayGroupColorVar } from '@/utils/muscle-groups'
import type { MuscleDisplayGroup } from '@/utils/muscle-groups'

const props = defineProps<{
  days: CalendarDay[]
  dayByDate: Record<string, DaySummary>
}>()
const emit = defineEmits<{ select: [date: string] }>()

function groupsFor(date: string): MuscleDisplayGroup[] {
  const summary = props.dayByDate[date]
  if (summary === undefined) return []
  return (Object.keys(summary.muscleSets) as MuscleDisplayGroup[]).filter(
    (group) => (summary.muscleSets[group] ?? 0) > 0,
  )
}
</script>

<template>
  <div class="calendar-grid">
    <div class="calendar-grid__head">
      <span v-for="(label, index) in WEEKDAY_LABELS" :key="index" class="calendar-grid__weekday">
        {{ label }}
      </span>
    </div>
    <div class="calendar-grid__cells">
      <button
        v-for="day in days"
        :key="day.date"
        type="button"
        class="calendar-cell"
        :class="{
          'calendar-cell--muted': !day.inCurrentMonth,
          'calendar-cell--today': day.isToday,
        }"
        :aria-label="day.date"
        @click="emit('select', day.date)"
      >
        <span class="calendar-cell__num">{{ day.dayOfMonth }}</span>
        <span class="calendar-cell__dots">
          <span
            v-for="group in groupsFor(day.date)"
            :key="group"
            class="calendar-cell__dot"
            :style="{ backgroundColor: displayGroupColorVar(group) }"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.calendar-grid__head,
.calendar-grid__cells {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-grid__head {
  margin-bottom: var(--space-1);
}

.calendar-grid__weekday {
  padding: var(--space-1) 0;
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--color-text-faint);
  text-align: center;
}

.calendar-grid__cells {
  gap: 4px;
}

.calendar-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  aspect-ratio: 1;
  padding-top: var(--space-1);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.calendar-cell--muted {
  opacity: 0.38;
}

.calendar-cell--today {
  border-color: var(--color-accent);
}

.calendar-cell:active {
  background-color: var(--color-surface-raised);
}

.calendar-cell__num {
  font-size: var(--text-sm);
  font-weight: 600;
}

.calendar-cell__dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  min-height: 5px;
}

.calendar-cell__dot {
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
}
</style>
