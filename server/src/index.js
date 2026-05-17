import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'

import { initDb, pool } from './db.js'

const app = express()
const PORT = process.env.PORT ?? 8787

// Railway terminates TLS at a proxy; trust one hop so rate-limiting and
// logging see the real client IP rather than the proxy's.
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: '8mb' }))

app.use(
  '/sync',
  rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

/** The four syncable entity kinds — must match the client's outbox entities. */
const ENTITIES = new Set(['routine', 'workout', 'set', 'pr'])

/** Pull page size; a client that sees `hasMore` syncs again to drain the rest. */
const PULL_LIMIT = 1000

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

/**
 * The one sync endpoint: a delta push/pull in a single round trip.
 *
 *   request:  { syncId, cursor, changes: [{ entity, id, updatedAt, deletedAt, payload }] }
 *   response: { changes: [...same shape + serverSeq], cursor, hasMore }
 *
 * Incoming changes are upserted with a last-write-wins guard (an older
 * version never overwrites a newer one). The response returns every record
 * for this account written since the client's cursor.
 */
app.post('/sync', async (req, res) => {
  const body = req.body ?? {}
  const syncId = body.syncId
  if (typeof syncId !== 'string' || syncId.length < 8 || syncId.length > 128) {
    res.status(400).json({ error: 'invalid syncId' })
    return
  }
  const cursor = Number.isFinite(body.cursor) ? Number(body.cursor) : 0
  const changes = Array.isArray(body.changes) ? body.changes : []

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const change of changes) {
      if (
        change === null ||
        typeof change !== 'object' ||
        typeof change.entity !== 'string' ||
        !ENTITIES.has(change.entity) ||
        typeof change.id !== 'string' ||
        change.id.length === 0 ||
        !Number.isFinite(change.updatedAt) ||
        change.payload === null ||
        typeof change.payload !== 'object'
      ) {
        continue
      }
      const deletedAt =
        change.deletedAt === null || change.deletedAt === undefined
          ? null
          : Number(change.deletedAt)
      await client.query(
        `INSERT INTO records (sync_id, entity, id, updated_at, deleted_at, payload, server_seq)
         VALUES ($1, $2, $3, $4, $5, $6, nextval('records_seq'))
         ON CONFLICT (sync_id, entity, id) DO UPDATE
           SET updated_at = EXCLUDED.updated_at,
               deleted_at = EXCLUDED.deleted_at,
               payload    = EXCLUDED.payload,
               server_seq = nextval('records_seq')
         WHERE records.updated_at < EXCLUDED.updated_at`,
        [
          syncId,
          change.entity,
          change.id,
          change.updatedAt,
          deletedAt,
          JSON.stringify(change.payload),
        ],
      )
    }

    const { rows } = await client.query(
      `SELECT entity, id, updated_at, deleted_at, payload, server_seq
         FROM records
        WHERE sync_id = $1 AND server_seq > $2
        ORDER BY server_seq
        LIMIT ${PULL_LIMIT}`,
      [syncId, cursor],
    )
    await client.query('COMMIT')

    const out = rows.map((row) => ({
      entity: row.entity,
      id: row.id,
      updatedAt: Number(row.updated_at),
      deletedAt: row.deleted_at === null ? null : Number(row.deleted_at),
      payload: row.payload,
      serverSeq: Number(row.server_seq),
    }))
    res.json({
      changes: out,
      cursor: out.length > 0 ? out[out.length - 1].serverSeq : cursor,
      hasMore: out.length === PULL_LIMIT,
    })
  } catch (cause) {
    await client.query('ROLLBACK')
    console.error('[hadid-sync] /sync failed', cause)
    res.status(500).json({ error: 'sync failed' })
  } finally {
    client.release()
  }
})

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[hadid-sync] listening on port ${PORT}`)
    })
  })
  .catch((cause) => {
    console.error('[hadid-sync] failed to initialise the database', cause)
    process.exit(1)
  })
