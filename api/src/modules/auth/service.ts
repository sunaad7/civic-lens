import bcrypt from 'bcryptjs'
import { db } from '../../db/client.js'
import type { User } from '../../db/types.js'
import { AppError } from '../../middleware/error.js'
import { createRefreshToken, hashRefreshToken, signAccessToken, type AuthUser } from '../../lib/jwt.js'

export const REFRESH_COOKIE = 'civic_refresh'

export interface UserProfile extends AuthUser {
  address_line: string | null
  city: string | null
  pincode: string | null
  phone: string | null
}

export interface TokenResponse {
  access_token: string
  user: UserProfile
}

function toAuthUser(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'citizen' | 'admin',
    address_line: user.address_line,
    city: user.city,
    pincode: user.pincode,
    phone: user.phone,
  }
}

function blankToNull(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value.length > 0 ? value : null
}

export async function register(input: {
  email: string
  password: string
  name: string
}): Promise<TokenResponse & { refresh: { token: string; expiresAt: Date } }> {
  const existing = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', input.email)
    .executeTakeFirst()
  if (existing) throw new AppError(409, 'An account with this email already exists')

  const passwordHash = await bcrypt.hash(input.password, 10)
  const user = await db
    .insertInto('users')
    .values({ email: input.email, password_hash: passwordHash, name: input.name, role: 'citizen' })
    .returningAll()
    .executeTakeFirstOrThrow()

  return issueTokens(toAuthUser(user))
}

export async function login(input: { email: string; password: string }): Promise<
  TokenResponse & { refresh: { token: string; expiresAt: Date } }
> {
  const user = await db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', input.email)
    .executeTakeFirst()

  const valid = user ? await bcrypt.compare(input.password, user.password_hash) : false
  if (!user || !valid) throw new AppError(401, 'Invalid email or password')

  return issueTokens(toAuthUser(user))
}

async function issueTokens(
  user: UserProfile,
): Promise<TokenResponse & { refresh: { token: string; expiresAt: Date } }> {
  const refresh = createRefreshToken()
  await db
    .insertInto('refresh_tokens')
    .values({ user_id: user.id, token_hash: refresh.hash, expires_at: refresh.expiresAt })
    .execute()
  return { access_token: signAccessToken(user), user, refresh: { token: refresh.token, expiresAt: refresh.expiresAt } }
}

export async function refresh(rawToken: string | undefined): Promise<
  TokenResponse & { refresh: { token: string; expiresAt: Date } }
> {
  if (!rawToken) throw new AppError(401, 'No refresh token provided')

  const row = await db
    .selectFrom('refresh_tokens')
    .innerJoin('users', 'users.id', 'refresh_tokens.user_id')
    .select([
      'refresh_tokens.id as id',
      'refresh_tokens.expires_at as expires_at',
      'refresh_tokens.revoked_at as revoked_at',
      'users.id as user_id',
      'users.email as email',
      'users.name as name',
      'users.role as role',
      'users.address_line as address_line',
      'users.city as city',
      'users.pincode as pincode',
      'users.phone as phone',
    ])
    .where('refresh_tokens.token_hash', '=', hashRefreshToken(rawToken))
    .executeTakeFirst()

  if (!row || row.revoked_at || row.expires_at.getTime() < Date.now()) {
    throw new AppError(401, 'Invalid or expired refresh token')
  }

  await db.updateTable('refresh_tokens').set({ revoked_at: new Date() }).where('id', '=', row.id).execute()

  return issueTokens({
    id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role as 'citizen' | 'admin',
    address_line: row.address_line,
    city: row.city,
    pincode: row.pincode,
    phone: row.phone,
  })
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return
  await db
    .updateTable('refresh_tokens')
    .set({ revoked_at: new Date() })
    .where('token_hash', '=', hashRefreshToken(rawToken))
    .where('revoked_at', 'is', null)
    .execute()
}

export async function getUserById(id: string): Promise<UserProfile> {
  const user = await db.selectFrom('users').selectAll().where('id', '=', id).executeTakeFirst()
  if (!user) throw new AppError(401, 'User no longer exists')
  return toAuthUser(user)
}

export interface UpdateProfileInput {
  name?: string
  email?: string
  current_password?: string
  password?: string
  address_line?: string
  city?: string
  pincode?: string
  phone?: string
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  currentRefreshToken?: string,
): Promise<UserProfile> {
  const user = await db.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst()
  if (!user) throw new AppError(401, 'User no longer exists')

  const emailChanged = input.email !== undefined && input.email !== user.email
  const passwordChanged = input.password !== undefined

  if (emailChanged || passwordChanged) {
    if (!input.current_password) {
      throw new AppError(400, 'Current password is required to change your email or password')
    }
    const valid = await bcrypt.compare(input.current_password, user.password_hash)
    if (!valid) throw new AppError(400, 'Current password is incorrect')
  }

  if (emailChanged) {
    const existing = await db
      .selectFrom('users')
      .select('id')
      .where('email', '=', input.email!)
      .executeTakeFirst()
    if (existing) throw new AppError(409, 'An account with this email already exists')
  }

  const values: {
    name?: string
    email?: string
    password_hash?: string
    address_line?: string | null
    city?: string | null
    pincode?: string | null
    phone?: string | null
  } = {}
  if (input.name !== undefined) values.name = input.name
  if (emailChanged) values.email = input.email
  if (passwordChanged) values.password_hash = await bcrypt.hash(input.password!, 10)
  if (input.address_line !== undefined) values.address_line = blankToNull(input.address_line) ?? null
  if (input.city !== undefined) values.city = blankToNull(input.city) ?? null
  if (input.pincode !== undefined) values.pincode = blankToNull(input.pincode) ?? null
  if (input.phone !== undefined) values.phone = blankToNull(input.phone) ?? null

  if (Object.keys(values).length === 0) return toAuthUser(user)

  const updated = await db
    .updateTable('users')
    .set(values)
    .where('id', '=', userId)
    .returningAll()
    .executeTakeFirstOrThrow()

  if (passwordChanged) {
    let revoke = db
      .updateTable('refresh_tokens')
      .set({ revoked_at: new Date() })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
    if (currentRefreshToken) revoke = revoke.where('token_hash', '!=', hashRefreshToken(currentRefreshToken))
    await revoke.execute()
  }

  return toAuthUser(updated)
}
