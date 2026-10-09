import 'dotenv/config'

export function testDbUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL is not set')
  const url = new URL(raw)
  url.pathname = '/civiclens_test'
  return url.toString()
}

export const TEST_ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@civiclens.local'
export const TEST_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin1234'
