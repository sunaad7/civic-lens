import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

const unique = () => Math.random().toString(36).slice(2)

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

async function registerUser(name: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `${name}-${unique()}@test.local`, password: 'password123', name })
    .expect(201)
  return res.body.access_token
}

const validComplaint = {
  title: 'Deep pothole near the bus stop',
  description: 'There is a deep pothole in the road near the main bus stop causing waterlogging.',
  category: 'roads',
  lat: '12.9716',
  lng: '77.5946',
  location_label: 'Main St & 2nd Ave',
}

describe('complaints', () => {
  let token = ''
  let complaintId = ''

  it('creates a complaint with an image and runs triage', async () => {
    token = await registerUser('Reporter')

    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('title', validComplaint.title)
      .field('description', validComplaint.description)
      .field('category', validComplaint.category)
      .field('lat', validComplaint.lat)
      .field('lng', validComplaint.lng)
      .field('location_label', validComplaint.location_label)
      .attach('images', PNG_1PX, { filename: 'hole.png', contentType: 'image/png' })
      .expect(201)

    complaintId = res.body.id
    expect(res.body.status).toBe('triaged')
    expect(res.body.ai_triage).toBeTruthy()
    expect(res.body.ai_triage.category).toBe('roads')
    expect(res.body.ai_triage.severity).toBeGreaterThanOrEqual(1)
    expect(res.body.location.lat).toBeCloseTo(12.9716, 4)
    expect(res.body.location.lng).toBeCloseTo(77.5946, 4)
    expect(res.body.images).toHaveLength(1)
    expect(res.body.images[0].url).toMatch(/^https?:\/\//)
    expect(res.body.events.map((e: { event_type: string }) => e.event_type)).toEqual(
      expect.arrayContaining(['created', 'triaged']),
    )
  })

  it('rejects invalid complaint payloads', async () => {
    await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'x')
      .field('description', 'too short')
      .field('category', 'roads')
      .field('lat', '999')
      .field('lng', '77.5946')
      .expect(400)
  })

  it('lists my complaints', async () => {
    const res = await request(app).get('/api/complaints').set('Authorization', `Bearer ${token}`).expect(200)
    const ids = res.body.map((c: { id: string }) => c.id)
    expect(ids).toContain(complaintId)
  })

  it('filters complaints by bounding box', async () => {
    const inside = await request(app)
      .get('/api/complaints?bbox=77,12,78,13')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(inside.body.map((c: { id: string }) => c.id)).toContain(complaintId)

    const outside = await request(app)
      .get('/api/complaints?bbox=-74,40,-73,42')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(outside.body).toHaveLength(0)
  })

  it('rejects malformed bbox values', async () => {
    await request(app)
      .get('/api/complaints?bbox=not-a-bbox')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
    await request(app)
      .get('/api/complaints?bbox=78,13,77,12')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })

  it('returns the complaint detail to its owner', async () => {
    const res = await request(app)
      .get(`/api/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.title).toBe(validComplaint.title)
    expect(res.body.images).toHaveLength(1)
    expect(res.body.events.length).toBeGreaterThanOrEqual(2)
  })

  it('hides the complaint from other citizens', async () => {
    const other = await registerUser('Stranger')
    await request(app).get(`/api/complaints/${complaintId}`).set('Authorization', `Bearer ${other}`).expect(404)
  })

  it('404s for unknown ids and 400s for malformed ids', async () => {
    const other = await registerUser('Curious')
    await request(app)
      .get('/api/complaints/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${other}`)
      .expect(404)
    await request(app).get('/api/complaints/not-a-uuid').set('Authorization', `Bearer ${other}`).expect(400)
  })

  it('requires authentication', async () => {
    await request(app).get('/api/complaints').expect(401)
    await request(app).post('/api/complaints').expect(401)
  })
})
