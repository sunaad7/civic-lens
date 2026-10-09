import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { sql } from 'kysely'
import { db } from '../../db/client.js'
import type { Json } from '../../db/types.js'
import type { AuthUser } from '../../lib/jwt.js'
import { logger } from '../../lib/logger.js'
import { publicUrl, removeImage, storeImage } from '../../lib/storage.js'
import { AppError } from '../../middleware/error.js'
import { getAiProvider } from '../ai/service.js'
import type { CreateComplaintInput } from './schema.js'

export interface ComplaintSummary {
  id: string
  title: string
  category: string
  status: string
  location_label: string | null
  lat: number
  lng: number
  created_at: Date
  updated_at: Date
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  submitted: ['triaged', 'rejected'],
  triaged: ['assigned', 'in_progress', 'rejected'],
  assigned: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'assigned'],
  resolved: ['in_progress'],
  rejected: ['submitted'],
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
}

const ALLOWED_EXTENSIONS = new Set(Object.values(MIME_EXTENSIONS))

function imageKey(originalName: string, mimeType: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : (MIME_EXTENSIONS[mimeType] ?? '.img')
  return `${randomUUID()}${safeExt}`
}

async function insertEvent(complaintId: string, eventType: string, actorId: string | null, payload: Json | null) {
  await db
    .insertInto('complaint_events')
    .values({ complaint_id: complaintId, event_type: eventType, actor_id: actorId, payload })
    .execute()
}

export async function createComplaint(
  user: AuthUser,
  input: CreateComplaintInput,
  files: { originalname: string; mimetype: string; buffer: Buffer }[],
): Promise<Record<string, unknown>> {
  const storedPaths: string[] = []
  let complaintId: string

  try {
    for (const file of files) {
      const key = imageKey(file.originalname, file.mimetype)
      storedPaths.push(await storeImage(key, file.buffer, file.mimetype))
    }

    const complaint = await db
      .insertInto('complaints')
      .values({
        reporter_id: user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        status: 'submitted',
        location: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
        location_label: input.location_label ?? null,
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    complaintId = complaint.id

    for (const storagePath of storedPaths) {
      await db
        .insertInto('complaint_images')
        .values({ complaint_id: complaintId, storage_path: storagePath })
        .execute()
    }

    await insertEvent(complaintId, 'created', user.id, null)
  } catch (err) {
    await Promise.allSettled(storedPaths.map((p) => removeImage(p)))
    throw err
  }

  try {
    const provider = getAiProvider()
    const triage = await provider.triage({
      description: input.description,
      images: files.map((f) => ({ bytes: f.buffer, mimeType: f.mimetype })),
    })
    await db
      .updateTable('complaints')
      .set({ ai_triage: triage as unknown as Json, status: 'triaged' })
      .where('id', '=', complaintId)
      .execute()
    await insertEvent(complaintId, 'triaged', null, triage as unknown as Json)
  } catch (err) {
    logger.error('triage failed', err)
  }

  return getComplaintDetail(complaintId, user)
}

export async function listMine(userId: string): Promise<ComplaintSummary[]> {
  const rows = await db
    .selectFrom('complaints')
    .select([
      'id',
      'title',
      'category',
      'status',
      'location_label',
      'created_at',
      'updated_at',
      sql<number>`ST_Y(location::geometry)`.as('lat'),
      sql<number>`ST_X(location::geometry)`.as('lng'),
    ])
    .where('reporter_id', '=', userId)
    .orderBy('created_at', 'desc')
    .execute()
  return rows
}

export async function listByBbox(
  bbox: { w: number; s: number; e: number; n: number },
  status: string | null,
): Promise<ComplaintSummary[]> {
  let query = db
    .selectFrom('complaints')
    .select([
      'id',
      'title',
      'category',
      'status',
      'location_label',
      'created_at',
      'updated_at',
      sql<number>`ST_Y(location::geometry)`.as('lat'),
      sql<number>`ST_X(location::geometry)`.as('lng'),
    ])
    .where(
      sql<boolean>`location::geometry && ST_MakeEnvelope(${bbox.w}, ${bbox.s}, ${bbox.e}, ${bbox.n}, 4326)`,
    )
    .orderBy('created_at', 'desc')
    .limit(500)

  if (status) query = query.where('status', '=', status)
  return await query.execute()
}

export async function getComplaintDetail(id: string, viewer: AuthUser): Promise<Record<string, unknown>> {
  const row = await db
    .selectFrom('complaints')
    .leftJoin('users', 'users.id', 'complaints.reporter_id')
    .leftJoin('users as assignee', 'assignee.id', 'complaints.assigned_to')
    .select([
      'complaints.id as id',
      'complaints.title as title',
      'complaints.description as description',
      'complaints.category as category',
      'complaints.status as status',
      'complaints.location_label as location_label',
      'complaints.ai_triage as ai_triage',
      'complaints.letter_draft as letter_draft',
      'complaints.reporter_id as reporter_id',
      'complaints.assigned_to as assigned_to',
      'complaints.created_at as created_at',
      'complaints.updated_at as updated_at',
      'users.name as reporter_name',
      'assignee.name as assignee_name',
      sql<number>`ST_Y(complaints.location::geometry)`.as('lat'),
      sql<number>`ST_X(complaints.location::geometry)`.as('lng'),
    ])
    .where('complaints.id', '=', id)
    .executeTakeFirst()

  if (!row || (viewer.role !== 'admin' && row.reporter_id !== viewer.id)) {
    throw new AppError(404, 'Complaint not found')
  }

  const [imageRows, eventRows] = await Promise.all([
    db
      .selectFrom('complaint_images')
      .select(['id', 'storage_path', 'created_at'])
      .where('complaint_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute(),
    db
      .selectFrom('complaint_events')
      .leftJoin('users', 'users.id', 'complaint_events.actor_id')
      .select([
        'complaint_events.id as id',
        'complaint_events.event_type as event_type',
        'complaint_events.payload as payload',
        'complaint_events.created_at as created_at',
        'users.name as actor_name',
      ])
      .where('complaint_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute(),
  ])

  const images = await Promise.all(
    imageRows.map(async (img) => ({
      id: img.id,
      url: await publicUrl(img.storage_path),
      created_at: img.created_at,
    })),
  )

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    location: { lat: Number(row.lat), lng: Number(row.lng) },
    location_label: row.location_label,
    ai_triage: row.ai_triage,
    letter_draft: row.letter_draft,
    reporter: row.reporter_id ? { id: row.reporter_id, name: row.reporter_name } : null,
    assigned_to: row.assigned_to,
    assignee_name: row.assignee_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images,
    events: eventRows.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      payload: e.payload,
      actor_name: e.actor_name,
      created_at: e.created_at,
    })),
  }
}

export async function updateStatus(
  id: string,
  status: string,
  note: string | undefined,
  actor: AuthUser,
): Promise<void> {
  const complaint = await db
    .selectFrom('complaints')
    .select(['id', 'status'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!complaint) throw new AppError(404, 'Complaint not found')

  const allowed = ALLOWED_TRANSITIONS[complaint.status] ?? []
  if (!allowed.includes(status)) {
    throw new AppError(400, `Cannot transition from "${complaint.status}" to "${status}"`)
  }

  await db.updateTable('complaints').set({ status }).where('id', '=', id).execute()
  await insertEvent(id, 'status_changed', actor.id, { from: complaint.status, to: status, note: note ?? null })
}

export async function assign(id: string, assigneeId: string, actor: AuthUser): Promise<void> {
  const [complaint, assignee] = await Promise.all([
    db.selectFrom('complaints').select(['id', 'status']).where('id', '=', id).executeTakeFirst(),
    db
      .selectFrom('users')
      .select(['id', 'name', 'role'])
      .where('id', '=', assigneeId)
      .executeTakeFirst(),
  ])
  if (!complaint) throw new AppError(404, 'Complaint not found')
  if (!assignee || assignee.role !== 'admin') throw new AppError(400, 'Assignee must be an admin user')

  const nextStatus = ['submitted', 'triaged'].includes(complaint.status) ? 'assigned' : complaint.status
  await db
    .updateTable('complaints')
    .set({ assigned_to: assigneeId, status: nextStatus })
    .where('id', '=', id)
    .execute()
  await insertEvent(id, 'assigned', actor.id, {
    assignee_id: assigneeId,
    assignee_name: assignee.name,
    previous_status: complaint.status,
    status: nextStatus,
  })
}

export async function getOrCreateLetter(id: string): Promise<string> {
  const complaint = await db
    .selectFrom('complaints')
    .select(['id', 'title', 'description', 'category', 'location_label', 'created_at', 'letter_draft'])
    .where('id', '=', id)
    .executeTakeFirst()
  if (!complaint) throw new AppError(404, 'Complaint not found')
  if (complaint.letter_draft) return complaint.letter_draft

  const letter = await getAiProvider().draftLetter({
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    locationLabel: complaint.location_label,
    createdAt: complaint.created_at,
  })
  await db.updateTable('complaints').set({ letter_draft: letter }).where('id', '=', id).execute()
  return letter
}

export async function listAdminUsers(): Promise<{ id: string; name: string; email: string }[]> {
  return await db
    .selectFrom('users')
    .select(['id', 'name', 'email'])
    .where('role', '=', 'admin')
    .orderBy('name', 'asc')
    .execute()
}

export interface AdminListFilters {
  status: string | null
  q: string | null
}

export async function listForAdmin(filters: AdminListFilters): Promise<Record<string, unknown>[]> {
  let query = db
    .selectFrom('complaints')
    .leftJoin('users', 'users.id', 'complaints.reporter_id')
    .leftJoin('users as assignee', 'assignee.id', 'complaints.assigned_to')
    .select([
      'complaints.id as id',
      'complaints.title as title',
      'complaints.category as category',
      'complaints.status as status',
      'complaints.location_label as location_label',
      'complaints.ai_triage as ai_triage',
      'complaints.assigned_to as assigned_to',
      'complaints.created_at as created_at',
      'complaints.updated_at as updated_at',
      'users.name as reporter_name',
      'assignee.name as assignee_name',
      sql<number>`ST_Y(complaints.location::geometry)`.as('lat'),
      sql<number>`ST_X(complaints.location::geometry)`.as('lng'),
    ])
    .orderBy('complaints.created_at', 'desc')
    .limit(200)

  if (filters.status) query = query.where('complaints.status', '=', filters.status)
  if (filters.q) {
    const pattern = `%${filters.q}%`
    query = query.where(
      sql<boolean>`(complaints.title ILIKE ${pattern} OR complaints.description ILIKE ${pattern} OR complaints.id::text ILIKE ${pattern})`,
    )
  }

  const rows = await query.execute()
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    location_label: row.location_label,
    ai_triage: row.ai_triage,
    assigned_to: row.assigned_to,
    assignee_name: row.assignee_name,
    reporter_name: row.reporter_name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}
