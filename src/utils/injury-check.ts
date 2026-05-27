import { INJURY_TRIGGERS, type InjuryId } from '@/data/injuries'
import type { Exercise } from '@/db/schema'

/**
 * Returns the active injuries an exercise might aggravate. An exercise is
 * flagged if its primary muscle AND its equipment both fall in the injury's
 * trigger set — so e.g. a barbell bench press flags a wrist injury, but a
 * machine chest press does not.
 */
export function stressedBy(
  exercise: Exercise,
  activeInjuries: readonly string[],
): InjuryId[] {
  const hits: InjuryId[] = []
  for (const id of activeInjuries) {
    const trigger = INJURY_TRIGGERS[id as InjuryId]
    if (trigger === undefined) continue
    if (
      trigger.muscles.includes(exercise.primary_muscle) &&
      trigger.equipment.includes(exercise.equipment)
    ) {
      hits.push(id as InjuryId)
    }
  }
  return hits
}

/**
 * Up to `max` substitute exercises that hit the same primary muscle but
 * avoid the triggering equipment. The list is ordered by alphabetic name
 * for determinism.
 */
export function findSubstitutes(
  exercise: Exercise,
  allExercises: Exercise[],
  activeInjuries: readonly string[],
  max = 3,
): Exercise[] {
  const triggeringEquipment = new Set<string>()
  for (const id of activeInjuries) {
    const trigger = INJURY_TRIGGERS[id as InjuryId]
    if (trigger === undefined) continue
    for (const eq of trigger.equipment) triggeringEquipment.add(eq)
  }
  return allExercises
    .filter((candidate) => candidate.id !== exercise.id)
    .filter((candidate) => candidate.deleted_at === null)
    .filter((candidate) => candidate.primary_muscle === exercise.primary_muscle)
    .filter((candidate) => !triggeringEquipment.has(candidate.equipment))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, max)
}
