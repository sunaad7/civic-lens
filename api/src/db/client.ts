import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { config } from '../config.js'
import type { Database } from './types.js'

// Keep the pool small: on serverless (Vercel) each instance holds its own pool,
// and Supabase's pooler limits total connections. 3 is plenty for this workload.
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
})

export async function closeDb(): Promise<void> {
  await db.destroy()
}
