import type { Exercise, WorkoutSet } from '@/db/schema'
import {
  MUSCLE_DISPLAY_GROUPS,
  rollUpMuscle,
  type MuscleDisplayGroup,
} from '@/utils/muscle-groups'

export interface GroupVolume {
  sets: number
  tonnage: number
}

export type VolumeByGroup = Record<MuscleDisplayGroup, GroupVolume>

export function emptyVolumeMap(): VolumeByGroup {
  const result = {} as VolumeByGroup
  for (const group of MUSCLE_DISPLAY_GROUPS) result[group] = { sets: 0, tonnage: 0 }
  return result
}

/**
 * Sums working set counts and tonnage per coarse muscle group across the
 * given sets. Each set is counted toward its exercise's primary muscle's
 * display group; cardio and full-body exercises are skipped.
 */
export function aggregateVolume(
  sets: WorkoutSet[],
  exerciseById: Map<string, Exercise>,
): VolumeByGroup {
  const result = emptyVolumeMap()
  for (const set of sets) {
    if (set.deleted_at !== null) continue
    const exercise = exerciseById.get(set.exercise_id)
    if (exercise === undefined) continue
    const group = rollUpMuscle(exercise.primary_muscle)
    if (group === null) continue
    result[group].sets += 1
    result[group].tonnage += set.weight * set.reps
  }
  return result
}
