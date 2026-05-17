import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (connectionString === undefined || connectionString === '') {
  console.error('[hadid-sync] DATABASE_URL is not set')
  process.exit(1)
}

// A managed Postgres (Railway, etc.) requires TLS; a local dev database does not.
const isLocal =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})

/**
 * Creates the single sync table on boot. Safe to run on every start.
 *
 * All synced records — routines, workouts, sets, prs — live in one table,
 * keyed by (sync_id, entity, id). `server_seq` is a monotonic write counter
 * that gives clients a reliable delta cursor: a pull asks for every row whose
 * `server_seq` is greater than the last one it saw.
 */
export async function initDb() {
  await pool.query(`
    CREATE SEQUENCE IF NOT EXISTS records_seq;

    CREATE TABLE IF NOT EXISTS records (
      sync_id    text   NOT NULL,
      entity     text   NOT NULL,
      id         text   NOT NULL,
      updated_at bigint NOT NULL,
      deleted_at bigint,
      payload    jsonb  NOT NULL,
      server_seq bigint NOT NULL,
      PRIMARY KEY (sync_id, entity, id)
    );

    CREATE INDEX IF NOT EXISTS records_pull_idx ON records (sync_id, server_seq);
  `)
}
