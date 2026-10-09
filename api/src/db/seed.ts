import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { pathToFileURL } from 'node:url'

export async function ensureAdmin(
  connectionString: string,
  email: string,
  password: string,
): Promise<void> {
  const pool = new Pool({ connectionString })
  try {
    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
      [email, hash, 'Administrator'],
    )
    console.log(`admin user ready: ${email}`)
  } finally {
    await pool.end()
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const { config } = await import('../config.js')
  ensureAdmin(config.DATABASE_URL, config.ADMIN_EMAIL, config.ADMIN_PASSWORD)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('seed failed:', err)
      process.exit(1)
    })
}
