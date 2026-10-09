import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

const unique = () => Math.random().toString(36).slice(2)

function extractCookie(res: request.Response): string {
  const raw = res.headers['set-cookie']
  const cookie = Array.isArray(raw) ? raw[0] : raw
  if (!cookie) throw new Error('expected set-cookie header')
  return cookie.split(';')[0]
}

describe('auth', () => {
  const email = `citizen-${unique()}@test.local`
  let accessToken = ''

  it('registers a new citizen', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Test Citizen' })
      .expect(201)

    expect(res.body.access_token).toBeTruthy()
    expect(res.body.user).toMatchObject({ email, name: 'Test Citizen', role: 'citizen' })
    accessToken = res.body.access_token
  })

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', name: 'Test Citizen' })
      .expect(409)
    expect(res.body.message).toMatch(/already exists/i)
  })

  it('rejects weak passwords', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: `weak-${unique()}@test.local`, password: 'short', name: 'Weak' })
      .expect(400)
  })

  it('rejects wrong password on login', async () => {
    await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' }).expect(401)
  })

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' })
      .expect(200)
    expect(res.body.access_token).toBeTruthy()
    expect(res.body.user.email).toBe(email)
  })

  it('returns 401 for /me without a token', async () => {
    await request(app).get('/api/auth/me').expect(401)
  })

  it('returns the current user with a valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200)
    expect(res.body.email).toBe(email)
    expect(res.body.role).toBe('citizen')
  })

  it('refreshes the session and rotates the refresh token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' }).expect(200)
    const cookie = extractCookie(login)

    const first = await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(200)
    expect(first.body.access_token).toBeTruthy()
    const rotatedCookie = extractCookie(first)

    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401)
    await request(app).post('/api/auth/refresh').set('Cookie', rotatedCookie).expect(200)
  })

  it('logs out and invalidates the refresh token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' }).expect(200)
    const cookie = extractCookie(login)

    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204)
    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401)
  })

  it('rejects malformed tokens', async () => {
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token').expect(401)
  })

  it('updates the display name without a password', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Renamed Citizen' })
      .expect(200)
    expect(res.body.name).toBe('Renamed Citizen')
    expect(res.body.email).toBe(email)

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200)
    expect(me.body.name).toBe('Renamed Citizen')
  })

  it('updates optional contact and address details without a password', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: '+91 98765 43210', address_line: '12 MG Road', city: 'Bengaluru', pincode: '560001' })
      .expect(200)

    expect(res.body).toMatchObject({
      phone: '+91 98765 43210',
      address_line: '12 MG Road',
      city: 'Bengaluru',
      pincode: '560001',
    })

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`).expect(200)
    expect(me.body.city).toBe('Bengaluru')
  })

  it('clears an optional field when submitted blank', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ address_line: '' })
      .expect(200)
    expect(res.body.address_line).toBeNull()
  })

  it('rejects email or password changes without the current password', async () => {
    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: `changed-${unique()}@test.local` })
      .expect(400)

    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'brandnewpass1' })
      .expect(400)
  })

  it('rejects an incorrect current password', async () => {
    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: `changed-${unique()}@test.local`, current_password: 'not-my-password' })
      .expect(400)
  })

  it('updates email and password with the current password, then rotates credentials', async () => {
    const profileEmail = `profile-${unique()}@test.local`
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: profileEmail, password: 'password123', name: 'Profile Tester' })
      .expect(201)
    const token = register.body.access_token as string

    const cookie = extractCookie(
      await request(app).post('/api/auth/login').send({ email: profileEmail, password: 'password123' }).expect(200),
    )

    const newEmail = `profile-new-${unique()}@test.local`
    const updated = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: newEmail, current_password: 'password123' })
      .expect(200)
    expect(updated.body.email).toBe(newEmail)

    await request(app).post('/api/auth/login').send({ email: profileEmail, password: 'password123' }).expect(401)
    await request(app).post('/api/auth/login').send({ email: newEmail, password: 'password123' }).expect(200)

    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'brandnewpass1', current_password: 'password123' })
      .expect(200)

    await request(app).post('/api/auth/login').send({ email: newEmail, password: 'password123' }).expect(401)
    await request(app).post('/api/auth/login').send({ email: newEmail, password: 'brandnewpass1' }).expect(200)

    // a password change revokes all outstanding refresh tokens
    await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401)
  })

  it('rejects an empty profile update', async () => {
    await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400)
  })

  it('rejects profile updates without a token', async () => {
    await request(app).patch('/api/auth/me').send({ name: 'Anonymous' }).expect(401)
  })
})
