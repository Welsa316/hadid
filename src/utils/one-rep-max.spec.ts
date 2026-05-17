import { describe, expect, it } from 'vitest'

import { estimateOneRepMax } from './one-rep-max'

describe('estimateOneRepMax', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(225, 1)).toBe(225)
  })

  it('applies the Epley formula for multiple reps', () => {
    // 100 × (1 + 10/30) = 133.33…
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 1)
    // 200 × (1 + 5/30) = 233.33…
    expect(estimateOneRepMax(200, 5)).toBeCloseTo(233.33, 1)
  })

  it('grows with reps at a fixed weight', () => {
    expect(estimateOneRepMax(100, 8)).toBeGreaterThan(estimateOneRepMax(100, 5))
  })

  it('returns 0 for non-positive weight or reps', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0)
    expect(estimateOneRepMax(100, 0)).toBe(0)
    expect(estimateOneRepMax(-10, 5)).toBe(0)
  })
})
