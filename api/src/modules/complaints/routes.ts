import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'
import { AppError } from '../../middleware/error.js'
import type { AuthUser } from '../../lib/jwt.js'
import {
  createComplaint,
  getComplaintDetail,
  listByBbox,
  listMine,
} from './service.js'
import { CATEGORIES, STATUSES, createComplaintSchema, parseBbox } from './schema.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new AppError(400, 'Only image uploads are allowed'))
  },
})

function authUser(req: { user?: AuthUser }): AuthUser {
  if (!req.user) throw new AppError(401, 'Authentication required')
  return req.user
}

router.use(requireAuth)

router.get('/', async (req, res) => {
  const user = authUser(req)
  const bboxRaw = typeof req.query.bbox === 'string' ? req.query.bbox : null
  if (bboxRaw) {
    const bbox = parseBbox(bboxRaw)
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : null
    if (statusRaw && !STATUSES.includes(statusRaw as (typeof STATUSES)[number])) {
      throw new AppError(400, 'Invalid status filter')
    }
    res.json(await listByBbox(bbox, statusRaw))
    return
  }
  res.json(await listMine(user.id))
})

router.post('/', upload.array('images', 5), async (req, res) => {
  const user = authUser(req)
  const input = createComplaintSchema.parse(req.body)
  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  res.status(201).json(await createComplaint(user, input, files))
})

router.get('/:id', async (req, res) => {
  const user = authUser(req)
  const id = z.uuid().parse(req.params.id)
  res.json(await getComplaintDetail(id, user))
})

export default router
export { CATEGORIES }
