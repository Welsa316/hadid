import type { Equipment, MuscleGroup } from '@/db/schema'

/* Exercise classification taxonomy: the fine-grained muscle groups stored on
 * exercises, their roll-up into coarse display groups, and display labels. */

/** Coarse muscle groups used for calendar color-coding and the muscle filter. */
export type MuscleDisplayGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core'

/** The six display groups, in presentation order. */
export const MUSCLE_DISPLAY_GROUPS: readonly MuscleDisplayGroup[] = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
]

/** Maps each fine-grained muscle to a display group. `cardio` and `full_body`
 *  belong to no single group and roll up to null. */
const DISPLAY_GROUP_BY_MUSCLE: Record<MuscleGroup, MuscleDisplayGroup | null> = {
  chest: 'chest',
  back: 'back',
  lats: 'back',
  traps: 'back',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  core: 'core',
  cardio: null,
  full_body: null,
}

export function rollUpMuscle(muscle: MuscleGroup): MuscleDisplayGroup | null {
  return DISPLAY_GROUP_BY_MUSCLE[muscle]
}

/** CSS custom property holding a display group's color (defined in tokens.css). */
export function displayGroupColorVar(group: MuscleDisplayGroup): string {
  return `var(--muscle-${group})`
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  lats: 'Lats',
  traps: 'Traps',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Full body',
}

export const DISPLAY_GROUP_LABELS: Record<MuscleDisplayGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  band: 'Band',
  bodyweight: 'Bodyweight',
  ez_bar: 'EZ bar',
  smith_machine: 'Smith machine',
  cardio: 'Cardio',
  other: 'Other',
}
