import { sql } from 'kysely'
import { db } from './client.js'

const args = process.argv.slice(2).join(' ').trim()

function usage(): string {
  return `Usage:
  npm run db:q -- "<sql>"      run any SQL and print rows
  npm run db:q -- --schema     list tables with row counts

Examples:
  npm run db:q -- "select id, title, status from complaints limit 5"
  npm run db:q -- "select email, role from users order by created_at desc"
  npm run db:q -- "select title, st_astext(location::geometry) as wkt from complaints"`
}

async function main(): Promise<void> {
  if (!args || args === '--help' || args === '-h') {
    console.log(usage())
    process.exit(args ? 0 : 1)
  }

  if (args === '--schema') {
    const { rows: tables } = await sql<{ table_name: string }>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `.execute(db)

    const summary: { table: string; rows: number }[] = []
    for (const table of tables) {
      const { rows } = await sql<{ n: number }>`SELECT count(*)::int AS n FROM ${sql.table(table.table_name)}`.execute(db)
      summary.push({ table: table.table_name, rows: rows[0].n })
    }
    console.table(summary)
    await db.destroy()
    process.exit(0)
  }

  const result = await sql.raw(args).execute(db)
  if (result.rows.length > 0) console.table(result.rows)
  else console.log('OK — no rows returned.')
  console.log(`${result.rows.length} row(s)`)
  await db.destroy()
  process.exit(0)
}

main().catch(async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`query failed: ${message}`)
  await db.destroy().catch(() => {})
  process.exit(1)
})
