import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../middleware/auth.js'
import { AppError } from '../../middleware/error.js'
import { getComplaintDetail, listForAdmin, updateStatus, assign, getOrCreateLetter, listAdminUsers } from '../complaints/service.js'
import { assignSchema, updateStatusSchema } from '../complaints/schema.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))

router.get('/complaints', async (req, res) => {
  const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : null
  const q = typeof req.query.q === 'string' && req.query.q ? req.query.q : null
  res.json(await listForAdmin({ status, q }))
})

router.get('/complaints/:id', async (req, res) => {
  const id = z.uuid().parse(req.params.id)
  if (!req.user) throw new AppError(401, 'Authentication required')
  res.json(await getComplaintDetail(id, req.user))
})

router.patch('/complaints/:id/status', async (req, res) => {
  const id = z.uuid().parse(req.params.id)
  const body = updateStatusSchema.parse(req.body)
  if (!req.user) throw new AppError(401, 'Authentication required')
  await updateStatus(id, body.status, body.note, req.user)
  res.json(await getComplaintDetail(id, req.user))
})

router.post('/complaints/:id/assign', async (req, res) => {
  const id = z.uuid().parse(req.params.id)
  const body = assignSchema.parse(req.body)
  if (!req.user) throw new AppError(401, 'Authentication required')
  await assign(id, body.assignee_id, req.user)
  res.json(await getComplaintDetail(id, req.user))
})

router.get('/complaints/:id/letter', async (req, res) => {
  const id = z.uuid().parse(req.params.id)
  res.json({ letter: await getOrCreateLetter(id) })
})

router.get('/users', async (_req, res) => {
  res.json(await listAdminUsers())
})

export default router
