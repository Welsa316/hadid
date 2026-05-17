import type { WorkoutSet } from '@/db/schema'

/* Training volume = weight × reps, summed across sets. v1 logs every set in a
 * single unit (lb), so no unit normalization is needed yet; revisit when a
 * kg input option is added. */

/** Volume of a single set. */
export function setVolume(set: WorkoutSet): number {
  return set.weight * set.reps
}

/** Total volume across a list of sets. */
export function workoutVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => total + setVolume(set), 0)
}
