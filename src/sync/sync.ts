import {
  applyRemoteRecord,
  deleteOutboxEntries,
  getMeta,
  getOutboxEntries,
  setMeta,
} from '@/db/queries'
import type { OutboxEntity, SyncedRecord } from '@/db/schema'

const SYNC_ID_KEY = 'sync_id'
const SYNC_CURSOR_KEY = 'sync_cursor'
const SYNC_LAST_AT_KEY = 'sync_last_at'

/** The sync server's base URL, or '' when this build has no backend wired up. */
const SYNC_URL = (import.meta.env.VITE_SYNC_URL ?? '').replace(/\/+$/, '')

/** A record in transit to or from the server. */
interface ServerChange {
  entity: string
  id: string
  updatedAt: number
  deletedAt: number | null
  payload: SyncedRecord
}

interface SyncResponse {
  changes: ServerChange[]
  cursor: number
  hasMore: boolean
}

export interface SyncResult {
  pushed: number
  pulled: number
}

/** Whether a sync backend is configured for this build. */
export function isSyncConfigured(): boolean {
  return SYNC_URL !== ''
}

/** The device's sync code — generates an anonymous one on first use. */
export async function getSyncId(): Promise<string> {
  const existing = await getMeta<string>(SYNC_ID_KEY)
  if (typeof existing === 'string' && existing.length > 0) return existing
  const fresh = crypto.randomUUID()
  await setMeta(SYNC_ID_KEY, fresh)
  return fresh
}

/**
 * Re-points this device at another sync account. The pull cursor resets to 0
 * so the next sync pulls that account's full history; local records are kept
 * and pushed, so they merge into the account rather than vanish.
 */
export async function setSyncId(id: string): Promise<void> {
  await setMeta(SYNC_ID_KEY, id)
  await setMeta(SYNC_CURSOR_KEY, 0)
}

/** Epoch-ms of this device's last successful sync, if any. */
export function getLastSyncedAt(): Promise<number | undefined> {
  return getMeta<number>(SYNC_LAST_AT_KEY)
}

/**
 * Runs one push/pull cycle: drains the outbox to the server, then applies any
 * records the server has that this device has not seen, repeating while the
 * server reports more pages. Throws on network/server failure so the caller
 * can surface an error and retry later.
 */
export async function runSync(): Promise<SyncResult> {
  if (!isSyncConfigured()) return { pushed: 0, pulled: 0 }
  const syncId = await getSyncId()

  let pushed = 0
  let pulled = 0
  let hasMore = true

  while (hasMore) {
    const cursor = (await getMeta<number>(SYNC_CURSOR_KEY)) ?? 0
    const outbox = await getOutboxEntries()
    const changes: ServerChange[] = outbox.map((entry) => {
      const record = entry.payload as SyncedRecord
      return {
        entity: entry.entity,
        id: entry.entity_id,
        updatedAt: record.updated_at,
        deletedAt: record.deleted_at,
        payload: record,
      }
    })

    const response = await fetch(`${SYNC_URL}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ syncId, cursor, changes }),
    })
    if (!response.ok) throw new Error(`sync request failed: HTTP ${response.status}`)
    const data = (await response.json()) as SyncResponse

    for (const change of data.changes) {
      if (await applyRemoteRecord(change.entity as OutboxEntity, change.payload)) {
        pulled += 1
      }
    }
    await setMeta(SYNC_CURSOR_KEY, data.cursor)

    if (outbox.length > 0) {
      await deleteOutboxEntries(outbox.map((entry) => entry.id))
      pushed += outbox.length
    }

    hasMore = data.hasMore
  }

  await setMeta(SYNC_LAST_AT_KEY, Date.now())
  return { pushed, pulled }
}
