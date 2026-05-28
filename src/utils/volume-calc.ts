import type { WorkoutSet } from '@/db/schema'

/* Training volume = weight × reps, summed across sets. v1 logs every set in a
 * single unit (lb), so no unit normalization is needed yet; revisit when a
 * kg input option is added. */

/** Volume of a single set, including every drop-set segment when present. */
export function setVolume(set: WorkoutSet): number {
  let total = set.weight * set.reps
  if (set.drop_segments !== undefined) {
    for (const segment of set.drop_segments) {
      total += segment.weight * segment.reps
    }
  }
  return total
}

/** Total volume across a list of sets. */
export function workoutVolume(sets: WorkoutSet[]): number {
  return sets.reduce((total, set) => total + setVolume(set), 0)
}
