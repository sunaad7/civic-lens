import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from './env.js'

const app = createApp()

const unique = () => Math.random().toString(36).slice(2)

async function adminLogin(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
    .expect(200)
  expect(res.body.user.role).toBe('admin')
  return res.body.access_token
}

async function citizenLogin(): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: `admin-test-${unique()}@test.local`, password: 'password123', name: 'Citizen' })
    .expect(201)
  return res.body.access_token
}

async function createComplaint(token: string, marker: string): Promise<string> {
  const res = await request(app)
    .post('/api/complaints')
    .set('Authorization', `Bearer ${token}`)
    .field('title', `Broken streetlight ${marker}`)
    .field('description', `The streetlight near the park is completely dark at night ${marker}.`)
    .field('category', 'lighting')
    .field('lat', '12.9716')
    .field('lng', '77.5946')
    .expect(201)
  return res.body.id
}

describe('admin', () => {
  let admin = ''
  let citizen = ''
  let complaintId = ''

  it('seeds and logs in an admin user', async () => {
    admin = await adminLogin()
    citizen = await citizenLogin()
  })

  it('lists complaints with filters', async () => {
    complaintId = await createComplaint(citizen, unique())

    const all = await request(app).get('/api/admin/complaints').set('Authorization', `Bearer ${admin}`).expect(200)
    expect(all.body.map((c: { id: string }) => c.id)).toContain(complaintId)

    const filtered = await request(app)
      .get('/api/admin/complaints?status=triaged')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(filtered.body.every((c: { status: string }) => c.status === 'triaged')).toBe(true)

    const searched = await request(app)
      .get('/api/admin/complaints?q=Broken streetlight')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(searched.body.map((c: { id: string }) => c.id)).toContain(complaintId)
  })

  it('searches complaints by full or partial id', async () => {
    const freshId = await createComplaint(citizen, unique())

    const byFullId = await request(app)
      .get(`/api/admin/complaints?q=${freshId}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(byFullId.body.map((c: { id: string }) => c.id)).toContain(freshId)

    const byPrefix = await request(app)
      .get(`/api/admin/complaints?q=${freshId.slice(0, 8)}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(byPrefix.body.map((c: { id: string }) => c.id)).toContain(freshId)
  })

  it('rejects invalid status transitions', async () => {
    const res = await request(app)
      .patch(`/api/admin/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'resolved' })
      .expect(400)
    expect(res.body.message).toMatch(/cannot transition/i)
  })

  it('applies a valid status transition and records an event', async () => {
    await request(app)
      .patch(`/api/admin/complaints/${complaintId}/status`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ status: 'in_progress', note: 'Crew dispatched' })
      .expect(200)

    const res = await request(app)
      .get(`/api/admin/complaints/${complaintId}`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(res.body.status).toBe('in_progress')
    const statusEvent = res.body.events.find((e: { event_type: string }) => e.event_type === 'status_changed')
    expect(statusEvent).toBeTruthy()
    expect(statusEvent.payload).toMatchObject({ from: 'triaged', to: 'in_progress', note: 'Crew dispatched' })
  })

  it('assigns a complaint to an admin user', async () => {
    const freshId = await createComplaint(citizen, unique())

    const users = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(users.body.length).toBeGreaterThan(0)
    const assignee = users.body[0]

    const res = await request(app)
      .post(`/api/admin/complaints/${freshId}/assign`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ assignee_id: assignee.id })
      .expect(200)
    expect(res.body.assigned_to).toBe(assignee.id)
    expect(res.body.status).toBe('assigned')
  })

  it('rejects assigning to a non-admin', async () => {
    const users = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${admin}`).expect(200)
    const citizenUserIds = new Set(users.body.map((u: { id: string }) => u.id))
    const freshId = await createComplaint(citizen, unique())

    const res = await request(app)
      .post(`/api/admin/complaints/${freshId}/assign`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ assignee_id: '00000000-0000-4000-8000-000000000000' })
      .expect(400)
    expect(res.body.message).toMatch(/admin/i)
    expect(citizenUserIds.size).toBeGreaterThan(0)
  })

  it('drafts a letter and caches it', async () => {
    const first = await request(app)
      .get(`/api/admin/complaints/${complaintId}/letter`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(typeof first.body.letter).toBe('string')
    expect(first.body.letter).toContain('Broken streetlight')

    const second = await request(app)
      .get(`/api/admin/complaints/${complaintId}/letter`)
      .set('Authorization', `Bearer ${admin}`)
      .expect(200)
    expect(second.body.letter).toBe(first.body.letter)
  })

  it('blocks citizens from admin endpoints', async () => {
    await request(app).get('/api/admin/complaints').set('Authorization', `Bearer ${citizen}`).expect(403)
    await request(app).get(`/api/admin/complaints/${complaintId}/letter`).set('Authorization', `Bearer ${citizen}`).expect(403)
    await request(app).get('/api/admin/users').set('Authorization', `Bearer ${citizen}`).expect(403)
  })
})
