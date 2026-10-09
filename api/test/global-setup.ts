import { runMigrations } from '../src/db/migrate.js'
import { ensureAdmin } from '../src/db/seed.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, testDbUrl } from './env.js'

export default async function globalSetup(): Promise<void> {
  const url = testDbUrl()
  await runMigrations(url)
  await ensureAdmin(url, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD)
}
