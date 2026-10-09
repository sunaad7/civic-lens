import { Router } from 'express'
import { z } from 'zod'
import { config } from '../../config.js'
import { requireAuth } from '../../middleware/auth.js'
import { AppError } from '../../middleware/error.js'
import {
  REFRESH_COOKIE,
  getUserById,
  login,
  logout,
  refresh,
  register,
  updateProfile,
} from './service.js'

const router = Router()

const registerSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().min(1, 'Name is required').max(120),
})

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const updateProfileSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(120).optional(),
    email: z.email('Enter a valid email address').optional(),
    current_password: z.string().min(1, 'Current password is required').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128).optional(),
    address_line: z.string().trim().max(200, 'Address is too long').optional(),
    city: z.string().trim().max(100, 'City is too long').optional(),
    pincode: z.string().trim().max(20, 'Postal code is too long').optional(),
    phone: z.string().trim().max(30, 'Phone number is too long').optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.email !== undefined ||
      body.password !== undefined ||
      body.address_line !== undefined ||
      body.city !== undefined ||
      body.pincode !== undefined ||
      body.phone !== undefined,
    { message: 'Nothing to update' },
  )

function setRefreshCookie(res: { cookie: Function }, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.isProduction,
    path: '/api/auth',
    expires: expiresAt,
  })
}

router.post('/register', async (req, res) => {
  const body = registerSchema.parse(req.body)
  const result = await register(body)
  setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt)
  res.status(201).json({ access_token: result.access_token, user: result.user })
})

router.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body)
  const result = await login(body)
  setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt)
  res.status(200).json({ access_token: result.access_token, user: result.user })
})

router.post('/refresh', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  const result = await refresh(raw)
  setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt)
  res.status(200).json({ access_token: result.access_token, user: result.user })
})

router.post('/logout', async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  await logout(raw)
  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.isProduction,
  })
  res.status(204).end()
})

router.get('/me', requireAuth, async (req, res) => {
  if (!req.user) throw new AppError(401, 'Authentication required')
  res.json(await getUserById(req.user.id))
})

router.patch('/me', requireAuth, async (req, res) => {
  if (!req.user) throw new AppError(401, 'Authentication required')
  const body = updateProfileSchema.parse(req.body)
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined
  res.json(await updateProfile(req.user.id, body, raw))
})

export default router
