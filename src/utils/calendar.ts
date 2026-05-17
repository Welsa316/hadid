import { localDateOf, todayLocalDate } from './dates'
import type { MuscleDisplayGroup } from './muscle-groups'

/** A single cell in a calendar grid or week strip. */
export interface CalendarDay {
  /** Local calendar day, YYYY-MM-DD. */
  date: string
  dayOfMonth: number
  /** Whether the day belongs to the month being displayed. */
  inCurrentMonth: boolean
  isToday: boolean
}

/** Aggregated workout data for one calendar day. */
export interface DaySummary {
  workoutIds: string[]
  /** Sets logged that day per muscle display group. */
  muscleSets: Partial<Record<MuscleDisplayGroup, number>>
}

/** Weekday column headers for a Monday-first grid. */
export const WEEKDAY_LABELS: readonly string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** Monday-first offset (0–6) of a JS weekday (0 = Sunday … 6 = Saturday). */
function mondayOffset(date: Date): number {
  return (date.getDay() + 6) % 7
}

function toCalendarDay(date: Date, monthIndex: number, today: string): CalendarDay {
  const iso = localDateOf(date.getTime())
  return {
    date: iso,
    dayOfMonth: date.getDate(),
    inCurrentMonth: date.getMonth() === monthIndex,
    isToday: iso === today,
  }
}

/** The 42 days (6 rows) of a Monday-first month grid for the given month. */
export function monthGrid(year: number, monthIndex: number): CalendarDay[] {
  const leading = mondayOffset(new Date(year, monthIndex, 1))
  const today = todayLocalDate()
  const days: CalendarDay[] = []
  for (let offset = 0; offset < 42; offset += 1) {
    days.push(toCalendarDay(new Date(year, monthIndex, 1 - leading + offset), monthIndex, today))
  }
  return days
}

/** The 7 days of the Monday-first week containing `reference`. */
export function weekDays(reference: Date): CalendarDay[] {
  const start = reference.getDate() - mondayOffset(reference)
  const today = todayLocalDate()
  const days: CalendarDay[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth(), start + offset)
    days.push(toCalendarDay(date, date.getMonth(), today))
  }
  return days
}

/** Whole days between two local dates (YYYY-MM-DD); negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const fromMs = new Date(`${from}T00:00:00`).getTime()
  const toMs = new Date(`${to}T00:00:00`).getTime()
  return Math.round((toMs - fromMs) / 86_400_000)
}

/** Month label, e.g. `May 2026`. */
export function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}
