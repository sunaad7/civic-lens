export type Role = 'citizen' | 'admin'

export type Status = 'submitted' | 'triaged' | 'assigned' | 'in_progress' | 'resolved' | 'rejected'

export const STATUSES: Status[] = ['submitted', 'triaged', 'assigned', 'in_progress', 'resolved', 'rejected']

export const STATUS_LABELS: Record<Status, string> = {
  submitted: 'Submitted',
  triaged: 'Triaged',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
}

export const CATEGORIES = ['roads', 'lighting', 'waste', 'water', 'parks', 'safety', 'other'] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  roads: 'Roads & Sidewalks',
  lighting: 'Street Lighting',
  waste: 'Waste & Sanitation',
  water: 'Water & Drainage',
  parks: 'Parks & Greenery',
  safety: 'Public Safety',
  other: 'Other',
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  address_line: string | null
  city: string | null
  pincode: string | null
  phone: string | null
}

export interface UpdateProfileInput {
  name?: string
  email?: string
  current_password?: string
  password?: string
  address_line?: string
  city?: string
  pincode?: string
  phone?: string
}

export interface GeoResult {
  lat: number
  lng: number
  label: string
  display_name: string
}

export interface TriageResult {
  category: string
  severity: number
  department: string
  confidence: number
  summary: string
  model: string
}

export interface ComplaintEvent {
  id: string
  event_type: string
  payload: Record<string, unknown> | null
  actor_name: string | null
  created_at: string
}

export interface ComplaintImage {
  id: string
  url: string
  created_at: string
}

export interface ComplaintSummary {
  id: string
  title: string
  category: string
  status: string
  location_label: string | null
  lat: number
  lng: number
  created_at: string
  updated_at: string
}

export interface ComplaintDetail {
  id: string
  title: string
  description: string
  category: string
  status: string
  location: { lat: number; lng: number }
  location_label: string | null
  ai_triage: TriageResult | null
  letter_draft: string | null
  reporter: { id: string; name: string | null } | null
  assigned_to: string | null
  assignee_name: string | null
  created_at: string
  updated_at: string
  images: ComplaintImage[]
  events: ComplaintEvent[]
}

export interface AdminComplaintRow {
  id: string
  title: string
  category: string
  status: string
  location_label: string | null
  ai_triage: TriageResult | null
  assigned_to: string | null
  assignee_name: string | null
  reporter_name: string | null
  lat: number
  lng: number
  created_at: string
  updated_at: string
}
