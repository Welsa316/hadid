import type { PrType, WorkoutSet } from '@/db/schema'
import { estimateOneRepMax } from './one-rep-max'

/** A personal record achieved by a set. */
export interface PrHit {
  type: PrType
  /** The record value: weight (heaviest_weight), reps (most_reps), or
   *  estimated one-rep max (1rm_estimate). */
  value: number
  /** Id of the set that achieved the record. */
  setId: string
}

/**
 * Detects personal records achieved by `newSets` — one exercise's sets within
 * a single workout — measured against `priorSets`, that exercise's sets from
 * earlier completed workouts. With no prior history the workout only
 * establishes a baseline, so no records are reported.
 */
export function detectPrs(newSets: WorkoutSet[], priorSets: WorkoutSet[]): PrHit[] {
  const hits: PrHit[] = []
  if (newSets.length === 0 || priorSets.length === 0) return hits

  // Heaviest weight ever lifted.
  const priorMaxWeight = Math.max(...priorSets.map((set) => set.weight))
  const heaviest = newSets.reduce((best, set) => (set.weight > best.weight ? set : best))
  if (heaviest.weight > priorMaxWeight) {
    hits.push({ type: 'heaviest_weight', value: heaviest.weight, setId: heaviest.id })
  }

  // Highest estimated one-rep max.
  const priorBest1Rm = Math.max(...priorSets.map((set) => estimateOneRepMax(set.weight, set.reps)))
  const best1RmSet = newSets.reduce((best, set) =>
    estimateOneRepMax(set.weight, set.reps) > estimateOneRepMax(best.weight, best.reps)
      ? set
      : best,
  )
  const best1Rm = estimateOneRepMax(best1RmSet.weight, best1RmSet.reps)
  if (best1Rm > priorBest1Rm) {
    hits.push({ type: '1rm_estimate', value: Math.round(best1Rm), setId: best1RmSet.id })
  }

  // Most reps performed at a given weight.
  const priorRepsByWeight = new Map<number, number>()
  for (const set of priorSets) {
    priorRepsByWeight.set(set.weight, Math.max(priorRepsByWeight.get(set.weight) ?? 0, set.reps))
  }
  const bestNewByWeight = new Map<number, WorkoutSet>()
  for (const set of newSets) {
    const current = bestNewByWeight.get(set.weight)
    if (current === undefined || set.reps > current.reps) bestNewByWeight.set(set.weight, set)
  }
  for (const [weight, set] of bestNewByWeight) {
    const priorReps = priorRepsByWeight.get(weight)
    if (priorReps !== undefined && set.reps > priorReps) {
      hits.push({ type: 'most_reps', value: set.reps, setId: set.id })
    }
  }

  return hits
}
