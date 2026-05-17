import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'

import { getDB } from './schema'

describe('IndexedDB schema', () => {
  it('creates all seven object stores', async () => {
    const db = await getDB()
    expect([...db.objectStoreNames].sort()).toEqual([
      'exercises',
      'meta',
      'outbox',
      'prs',
      'routines',
      'sets',
      'workouts',
    ])
  })

  it('creates the indexes that core queries depend on', async () => {
    const db = await getDB()
    const tx = db.transaction(['sets', 'workouts', 'exercises'])

    expect([...tx.objectStore('sets').indexNames].sort()).toEqual([
      'by_exercise_completed',
      'by_exercise_id',
      'by_workout_id',
    ])
    expect([...tx.objectStore('workouts').indexNames].sort()).toEqual([
      'by_local_date',
      'by_started_at',
      'by_status',
    ])
    expect([...tx.objectStore('exercises').indexNames].sort()).toEqual([
      'by_primary_muscle',
      'by_type',
    ])

    await tx.done
  })
})
