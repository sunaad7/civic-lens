import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely'

export type Json = Record<string, unknown>

export interface UsersTable {
  id: Generated<string>
  email: string
  password_hash: string
  name: string
  role: ColumnType<string, string | undefined, string>
  address_line: ColumnType<string | null, string | null | undefined, string | null>
  city: ColumnType<string | null, string | null | undefined, string | null>
  pincode: ColumnType<string | null, string | null | undefined, string | null>
  phone: ColumnType<string | null, string | null | undefined, string | null>
  created_at: Generated<Date>
}

export interface ComplaintsTable {
  id: Generated<string>
  reporter_id: string | null
  title: string
  description: string
  category: string
  status: ColumnType<string, string | undefined, string>
  location: unknown
  location_label: ColumnType<string | null, string | null | undefined, string | null>
  ai_triage: ColumnType<Json | null, Json | null | undefined, Json | null>
  letter_draft: ColumnType<string | null, string | null | undefined, string | null>
  assigned_to: ColumnType<string | null, string | null | undefined, string | null>
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface ComplaintImagesTable {
  id: Generated<string>
  complaint_id: string
  storage_path: string
  ai_analysis: ColumnType<Json | null, Json | null | undefined, Json | null>
  created_at: Generated<Date>
}

export interface ComplaintEventsTable {
  id: Generated<string>
  complaint_id: string
  event_type: string
  actor_id: string | null
  payload: ColumnType<Json | null, Json | null | undefined, Json | null>
  created_at: Generated<Date>
}

export interface RefreshTokensTable {
  id: Generated<string>
  user_id: string
  token_hash: string
  expires_at: Date
  revoked_at: ColumnType<Date | null, Date | null | undefined, Date | null>
  created_at: Generated<Date>
}

export interface Database {
  users: UsersTable
  complaints: ComplaintsTable
  complaint_images: ComplaintImagesTable
  complaint_events: ComplaintEventsTable
  refresh_tokens: RefreshTokensTable
}

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>
export type Complaint = Selectable<ComplaintsTable>
export type NewComplaint = Insertable<ComplaintsTable>
export type ComplaintUpdate = Updateable<ComplaintsTable>
export type ComplaintImage = Selectable<ComplaintImagesTable>
export type ComplaintEvent = Selectable<ComplaintEventsTable>
export type RefreshToken = Selectable<RefreshTokensTable>
