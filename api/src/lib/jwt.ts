import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'citizen' | 'admin'
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ email: user.email, name: user.name, role: user.role }, config.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: config.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, config.JWT_ACCESS_SECRET)
  if (typeof payload === 'string' || !payload.sub || !payload.email || !payload.name || !payload.role) {
    throw new Error('Invalid token payload')
  }
  const role = payload.role
  if (role !== 'citizen' && role !== 'admin') throw new Error('Invalid role in token')
  return { id: payload.sub, email: payload.email, name: payload.name, role }
}

export interface RefreshTokenPair {
  token: string
  hash: string
  expiresAt: Date
}

export function createRefreshToken(): RefreshTokenPair {
  const token = randomBytes(48).toString('hex')
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
  }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
