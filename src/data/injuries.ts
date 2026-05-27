import type { Equipment, MuscleGroup } from '@/db/schema'

export const INJURIES = [
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'lower_back', label: 'Lower back' },
  { id: 'knee', label: 'Knee' },
  { id: 'elbow', label: 'Elbow' },
  { id: 'wrist', label: 'Wrist' },
] as const

export type InjuryId = (typeof INJURIES)[number]['id']

/**
 * Curated triggers per injury — combinations of primary muscle and equipment
 * that typically aggravate the area. A coarse heuristic, not medical advice:
 * if an exercise matches both a muscle and equipment, it's flagged. Users
 * can always proceed; the substitute list is a suggestion.
 */
export const INJURY_TRIGGERS: Record<
  InjuryId,
  { muscles: MuscleGroup[]; equipment: Equipment[] }
> = {
  shoulder: {
    muscles: ['shoulders', 'chest'],
    equipment: ['barbell', 'smith_machine'],
  },
  lower_back: {
    muscles: ['back', 'lats', 'quads', 'hamstrings', 'glutes'],
    equipment: ['barbell'],
  },
  knee: {
    muscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    equipment: ['barbell', 'smith_machine'],
  },
  elbow: {
    muscles: ['biceps', 'triceps'],
    equipment: ['barbell', 'ez_bar'],
  },
  wrist: {
    muscles: ['chest', 'biceps', 'triceps', 'forearms'],
    equipment: ['barbell'],
  },
}
