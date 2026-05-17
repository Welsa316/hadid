/**
 * Estimated one-rep max via the Epley formula: weight × (1 + reps / 30).
 * Returns 0 for non-positive input; returns the weight itself for a single rep.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}
