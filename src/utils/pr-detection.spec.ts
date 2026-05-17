import { describe, expect, it } from 'vitest'

import type { WorkoutSet } from '@/db/schema'
import { detectPrs } from './pr-detection'

function makeSet(over: Partial<WorkoutSet>): WorkoutSet {
  return {
    id: 'set',
    workout_id: 'w',
    exercise_id: 'e',
    set_number: 1,
    reps: 0,
    weight: 0,
    weight_unit: 'lb',
    is_warmup: false,
    is_pr: false,
    completed_at: 0,
    created_at: 0,
    updated_at: 0,
    deleted_at: null,
    last_synced_at: null,
    _v: 1,
    ...over,
  }
}

describe('detectPrs', () => {
  it('reports nothing with no prior history (a baseline workout)', () => {
    expect(detectPrs([makeSet({ weight: 100, reps: 5 })], [])).toEqual([])
  })

  it('reports nothing when there are no new sets', () => {
    expect(detectPrs([], [makeSet({ weight: 100, reps: 5 })])).toEqual([])
  })

  it('detects a heaviest-weight PR', () => {
    const hits = detectPrs(
      [makeSet({ id: 's1', weight: 110, reps: 5 })],
      [makeSet({ weight: 100, reps: 5 })],
    )
    expect(hits).toContainEqual({ type: 'heaviest_weight', value: 110, setId: 's1' })
  })

  it('does not flag a heaviest-weight PR when the weight is not beaten', () => {
    const hits = detectPrs(
      [makeSet({ weight: 140, reps: 5 })],
      [makeSet({ weight: 150, reps: 5 })],
    )
    expect(hits.some((hit) => hit.type === 'heaviest_weight')).toBe(false)
  })

  it('detects an estimated 1RM PR from more reps at the same weight', () => {
    const hits = detectPrs(
      [makeSet({ weight: 100, reps: 8 })],
      [makeSet({ weight: 100, reps: 5 })],
    )
    expect(hits.some((hit) => hit.type === '1rm_estimate')).toBe(true)
  })

  it('detects a most-reps PR at a given weight', () => {
    const hits = detectPrs(
      [makeSet({ id: 's3', weight: 135, reps: 10 })],
      [makeSet({ weight: 135, reps: 8 })],
    )
    expect(hits).toContainEqual({ type: 'most_reps', value: 10, setId: 's3' })
  })

  it('does not flag most-reps at a weight never trained before', () => {
    const hits = detectPrs(
      [makeSet({ weight: 135, reps: 6 })],
      [makeSet({ weight: 100, reps: 12 })],
    )
    expect(hits.some((hit) => hit.type === 'most_reps')).toBe(false)
  })
})
