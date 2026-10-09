import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).optional(),
  DB_POOL_MAX: z.coerce.number().int().positive().default(3),
  AI_PROVIDER: z.enum(['stub']).default('stub'),
  SUPABASE_URL: z.string().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(''),
  SUPABASE_BUCKET: z.string().default('complaint-images'),
  UPLOAD_DIR: z.string().default('uploads'),
  API_PUBLIC_URL: z.string().default('http://localhost:3001'),
  ADMIN_EMAIL: z.string().default('admin@civiclens.local'),
  ADMIN_PASSWORD: z.string().default('admin1234'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

const isProduction = parsed.data.NODE_ENV === 'production'

if (isProduction) {
  const problems: string[] = []
  if (parsed.data.JWT_ACCESS_SECRET.length < 32) {
    problems.push('JWT_ACCESS_SECRET must be at least 32 characters in production')
  }
  if (parsed.data.JWT_REFRESH_SECRET.length < 32) {
    problems.push('JWT_REFRESH_SECRET must be at least 32 characters in production')
  }
  if (parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different')
  }
  if (parsed.data.ADMIN_PASSWORD === 'admin1234') {
    console.warn('WARN: ADMIN_PASSWORD is still the default value. Change it before seeding production.')
  }
  if (problems.length > 0) {
    console.error('Refusing to start with insecure production configuration:')
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
  }
}

export const config = {
  ...parsed.data,
  isProduction,
  trustProxy: parsed.data.TRUST_PROXY ?? (isProduction ? 1 : 0),
  cookieSameSite: parsed.data.COOKIE_SAMESITE ?? (isProduction ? 'none' : 'lax'),
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

export type Config = typeof config
