import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

describe('health probes', () => {
  it('reports liveness on /healthz', async () => {
    const res = await request(app).get('/healthz').expect(200)
    expect(res.body.ok).toBe(true)
    expect(typeof res.body.uptime).toBe('number')
  })

  it('reports database readiness on /readyz', async () => {
    const res = await request(app).get('/readyz').expect(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns a 404 for unknown routes', async () => {
    await request(app).get('/api/does-not-exist').expect(404)
  })
})
