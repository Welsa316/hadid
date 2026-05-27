import {
  getAllExercises,
  getAllPrs,
  getAllRoutines,
  getAllSets,
  getAllWorkouts,
} from '@/db/queries'
import type { Exercise, PersonalRecord, Routine, Workout, WorkoutSet } from '@/db/schema'

interface ExportBundle {
  exported_at: string
  app_version: string
  exercises: Exercise[]
  routines: Routine[]
  workouts: Workout[]
  sets: WorkoutSet[]
  prs: PersonalRecord[]
}

/** Loads every non-deleted record into a single in-memory bundle. */
async function loadBundle(): Promise<ExportBundle> {
  const [exercises, routines, workouts, sets, prs] = await Promise.all([
    getAllExercises(),
    getAllRoutines(),
    getAllWorkouts(),
    getAllSets(),
    getAllPrs(),
  ])
  return {
    exported_at: new Date().toISOString(),
    app_version: '1.0.0',
    exercises,
    routines,
    workouts,
    sets,
    prs,
  }
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

/**
 * Builds a CSV with one row per set, joined with workout date + exercise
 * name for portability into spreadsheets. Heavier metadata (routines, PRs)
 * is omitted; use the JSON export for the full picture.
 */
function buildCsv(bundle: ExportBundle): string {
  const workoutById = new Map(bundle.workouts.map((workout) => [workout.id, workout]))
  const exerciseById = new Map(bundle.exercises.map((exercise) => [exercise.id, exercise]))

  const header = [
    'workout_id',
    'date',
    'started_at_iso',
    'exercise',
    'set_number',
    'weight',
    'weight_unit',
    'reps',
    'is_warmup',
    'is_pr',
  ].join(',')

  const ordered = [...bundle.sets].sort((a, b) => {
    const ai = workoutById.get(a.workout_id)?.started_at ?? 0
    const bi = workoutById.get(b.workout_id)?.started_at ?? 0
    if (ai !== bi) return ai - bi
    if (a.exercise_id !== b.exercise_id) return a.exercise_id.localeCompare(b.exercise_id)
    return a.set_number - b.set_number
  })

  const rows = ordered.map((set) => {
    const workout = workoutById.get(set.workout_id)
    const exercise = exerciseById.get(set.exercise_id)
    return [
      csvCell(set.workout_id),
      csvCell(workout?.local_date),
      csvCell(workout === undefined ? '' : new Date(workout.started_at).toISOString()),
      csvCell(exercise?.name),
      csvCell(set.set_number),
      csvCell(set.weight),
      csvCell(set.weight_unit),
      csvCell(set.reps),
      csvCell(set.is_warmup),
      csvCell(set.is_pr),
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean
    share?: (data: ShareData) => Promise<void>
  }
  if (typeof nav.canShare === 'function' && typeof nav.share === 'function') {
    try {
      const file = new File([blob], filename, { type: blob.type })
      if (nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: filename })
        return
      }
    } catch (cause: unknown) {
      console.error('[hadid] share failed; falling back to download', cause)
    }
  }
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dateStamp(): string {
  const date = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

export async function exportAsCsv(): Promise<void> {
  const bundle = await loadBundle()
  const csv = buildCsv(bundle)
  await shareOrDownload(new Blob([csv], { type: 'text/csv' }), `hadid-export-${dateStamp()}.csv`)
}

export async function exportAsJson(): Promise<void> {
  const bundle = await loadBundle()
  const json = JSON.stringify(bundle, null, 2)
  await shareOrDownload(
    new Blob([json], { type: 'application/json' }),
    `hadid-export-${dateStamp()}.json`,
  )
}
