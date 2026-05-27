import type { ExerciseType, GymProfile, WeightUnit, WorkoutSet } from '@/db/schema'
import { roundToLoadable } from '@/utils/plate-calculator'

export interface SetSuggestion {
  weight: number
  reps: number
  /** Whether this is a deload (negative delta from last session). */
  deload: boolean
}

/**
 * Returns the suggested next working set for an exercise, computed from the
 * user's own history. The rule keeps the user in control:
 * - Hit the rep target every set last session → bump by the default increment.
 * - Missed reps → repeat the same weight at the target.
 * - No history → no suggestion (the routine target alone is the cue).
 *
 * If a gym profile is configured the suggestion is rounded down to the
 * closest loadable weight, so it never proposes a number the user can't
 * actually rack.
 */
export function suggestNextSet(
  lastSets: WorkoutSet[],
  targetReps: number,
  exerciseType: ExerciseType,
  unit: WeightUnit,
  profile: GymProfile | null,
): SetSuggestion | null {
  if (lastSets.length === 0 || targetReps <= 0) return null
  const baseline = lastSets[0]
  if (baseline === undefined) return null

  const hitTarget = lastSets.every((set) => set.reps >= targetReps)
  if (!hitTarget) {
    return { weight: baseline.weight, reps: targetReps, deload: false }
  }

  const increment = defaultIncrement(exerciseType, unit)
  const raw = baseline.weight + increment
  if (profile === null) {
    return { weight: raw, reps: targetReps, deload: false }
  }
  const rounded = roundToLoadable(raw, profile.bar_weight, profile.plates)
  return {
    weight: rounded?.achievedWeight ?? raw,
    reps: targetReps,
    deload: false,
  }
}

/** Default weight bump per exercise type and unit. Compounds bump faster. */
function defaultIncrement(type: ExerciseType, unit: WeightUnit): number {
  if (type === 'compound') return unit === 'lb' ? 5 : 2.5
  if (type === 'isolation') return unit === 'lb' ? 2.5 : 1.25
  return 0
}
