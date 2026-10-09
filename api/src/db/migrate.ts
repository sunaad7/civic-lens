import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Pool } from 'pg'

const MIGRATIONS_DIR = path.resolve(fileURLToPath(new URL('../../migrations/', import.meta.url)))

export async function runMigrations(connectionString: string, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  const pool = new Pool({ connectionString })
  const applied: string[] = []
  try {
    const client = await pool.connect()
    try {
      await client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
      )
      const existing = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
      const alreadyApplied = new Set(existing.rows.map((r) => r.name))
      const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
      for (const file of files) {
        if (alreadyApplied.has(file)) continue
        const sqlText = await readFile(path.join(dir, file), 'utf8')
        await client.query('BEGIN')
        try {
          await client.query(sqlText)
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
          await client.query('COMMIT')
          applied.push(file)
          console.log(`migration applied: ${file}`)
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        }
      }
    } finally {
      client.release()
    }
  } finally {
    await pool.end()
  }
  return applied
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const { config } = await import('../config.js')
  runMigrations(config.DATABASE_URL)
    .then((applied) => {
      console.log(applied.length ? `${applied.length} migration(s) applied` : 'database up to date')
      process.exit(0)
    })
    .catch((err) => {
      console.error('migration failed:', err)
      process.exit(1)
    })
}
