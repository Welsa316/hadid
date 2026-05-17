import { describe, expect, it } from 'vitest'

import { daysBetween, monthGrid, weekDays } from './calendar'

describe('monthGrid', () => {
  it('always returns a 42-cell grid', () => {
    expect(monthGrid(2026, 0)).toHaveLength(42)
    expect(monthGrid(2026, 1)).toHaveLength(42)
    expect(monthGrid(2026, 11)).toHaveLength(42)
  })

  it('includes every day of the month exactly once', () => {
    expect(monthGrid(2026, 0).filter((day) => day.inCurrentMonth)).toHaveLength(31)
    expect(monthGrid(2026, 1).filter((day) => day.inCurrentMonth)).toHaveLength(28)
    expect(monthGrid(2026, 3).filter((day) => day.inCurrentMonth)).toHaveLength(30)
  })

  it('orders in-month days from 1 to the last day', () => {
    const inMonth = monthGrid(2026, 0).filter((day) => day.inCurrentMonth)
    expect(inMonth[0]?.dayOfMonth).toBe(1)
    expect(inMonth.at(-1)?.dayOfMonth).toBe(31)
  })
})

describe('weekDays', () => {
  it('returns 7 consecutive days starting on Monday', () => {
    const week = weekDays(new Date(2026, 0, 15))
    expect(week).toHaveLength(7)
    expect(new Date(`${week[0]?.date}T00:00:00`).getDay()).toBe(1)
  })
})

describe('daysBetween', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetween('2026-05-01', '2026-05-08')).toBe(7)
    expect(daysBetween('2026-05-10', '2026-05-09')).toBe(-1)
    expect(daysBetween('2026-05-05', '2026-05-05')).toBe(0)
  })
})
