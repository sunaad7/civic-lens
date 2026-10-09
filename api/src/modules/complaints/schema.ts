import { z } from 'zod'
import { AppError } from '../../middleware/error.js'

export const CATEGORIES = ['roads', 'lighting', 'waste', 'water', 'parks', 'safety', 'other'] as const
export const STATUSES = ['submitted', 'triaged', 'assigned', 'in_progress', 'resolved', 'rejected'] as const

export const createComplaintSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(CATEGORIES),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  location_label: z.string().max(300).optional(),
})

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>

export const updateStatusSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().max(500).optional(),
})

export const assignSchema = z.object({
  assignee_id: z.uuid(),
})

export interface Bbox {
  w: number
  s: number
  e: number
  n: number
}

export function parseBbox(raw: string): Bbox {
  const parts = raw.split(',').map((p) => Number(p.trim()))
  const invalid = parts.length !== 4 || parts.some((n) => !Number.isFinite(n))
  const [w, s, e, n] = parts
  if (invalid || w < -180 || e > 180 || s < -90 || n > 90 || w >= e || s >= n) {
    throw new AppError(400, 'bbox must be "west,south,east,north" with valid coordinates')
  }
  return { w, s, e, n }
}
