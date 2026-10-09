import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge'
import { apiFetch } from '../../lib/api'
import { useAuth } from '../../lib/useAuth'
import {
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Category,
  type ComplaintSummary,
  type Status,
} from '../../lib/types'

const OPEN_STATUSES: Status[] = ['submitted', 'triaged', 'assigned', 'in_progress']

function categoryLabel(category: string): string {
  return category in CATEGORY_LABELS ? CATEGORY_LABELS[category as Category] : category
}

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function firstName(name?: string): string {
  return name?.trim().split(/\s+/)[0] ?? 'there'
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => apiFetch<ComplaintSummary[]>('/complaints'),
  })

  const complaints = data ?? []
  const total = complaints.length
  const open = complaints.filter((c) => OPEN_STATUSES.includes(c.status as Status)).length
  const resolved = complaints.filter((c) => c.status === 'resolved').length
  const rejected = complaints.filter((c) => c.status === 'rejected').length
  const awaiting = complaints.filter((c) => c.status === 'submitted').length

  const counts = STATUSES.map((status) => ({
    status,
    count: complaints.filter((c) => c.status === status).length,
  }))
  const maxCount = Math.max(1, ...counts.map((c) => c.count))
  const recent = complaints.slice(0, 5)

  const optionalFields = [user?.phone, user?.address_line, user?.city, user?.pincode]
  const filled = optionalFields.filter((value) => Boolean(value && value.trim())).length
  const completeness = Math.round((filled / optionalFields.length) * 100)

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-lead">
          <div>
            <span className="page-eyebrow">Dashboard</span>
            <h1>
              {greeting()}, {firstName(user?.name)}
            </h1>
          </div>
          <Link className="btn btn-primary" to="/report">
            Report an issue
          </Link>
        </div>
        <p className="muted">A snapshot of what you have reported and where it stands.</p>
      </header>

      {isLoading && (
        <div className="stat-grid" aria-busy="true" aria-label="Loading dashboard">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="card stat-card">
              <span className="skeleton" style={{ width: '42%' }} />
              <span className="skeleton" style={{ width: '30%', height: '1.6rem' }} />
              <span className="skeleton" style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-error">{error instanceof Error ? error.message : 'Failed to load'}</div>
      )}

      {data && (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <span className="stat-label">Total reports</span>
              <span className="stat-value">{total}</span>
              <span className="stat-foot muted">All time</span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Open</span>
              <span className="stat-value">{open}</span>
              <span className="stat-foot muted">
                {awaiting > 0 ? `${awaiting} awaiting triage` : 'Being worked on'}
              </span>
            </div>
            <div className="card stat-card stat-card-positive">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{resolved}</span>
              <span className="stat-foot muted">
                {total > 0 ? `${Math.round((resolved / total) * 100)}% resolution rate` : 'No reports yet'}
              </span>
            </div>
            <div className="card stat-card">
              <span className="stat-label">Rejected</span>
              <span className="stat-value">{rejected}</span>
              <span className="stat-foot muted">Closed without action</span>
            </div>
          </div>

          <div className="detail-grid">
            <section className="card">
              <div className="section-head">
                <h2>Status breakdown</h2>
              </div>
              {total === 0 ? (
                <p className="muted">Submit your first report to see the breakdown here.</p>
              ) : (
                <ul className="bar-list">
                  {counts.map(({ status, count }) => (
                    <li key={status}>
                      <div className="bar-row">
                        <span className="bar-name">{STATUS_LABELS[status]}</span>
                        <span className="bar-count">{count}</span>
                      </div>
                      <div className="bar-track">
                        <span
                          className={`bar-fill bar-fill-${status}`}
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <aside className="detail-stack">
              <section className="card">
                <div className="section-head">
                  <h2>Profile completeness</h2>
                </div>
                <div className="meter" role="img" aria-label={`Profile ${completeness}% complete`}>
                  <span style={{ width: `${completeness}%` }} />
                </div>
                <p className="muted mt-2">
                  {completeness === 100
                    ? 'Your contact and address details are complete.'
                    : 'Add your phone, address, city, and postal code so responders can reach you.'}
                </p>
                <Link className="btn btn-secondary btn-block mt-2" to="/profile">
                  {filled === 0 ? 'Add your details' : 'Update details'}
                </Link>
              </section>

              <section className="card">
                <div className="section-head">
                  <h2>Quick actions</h2>
                </div>
                <div className="action-list">
                  <Link to="/report">Report an issue</Link>
                  <Link to="/my">View all reports</Link>
                  <Link to="/profile">Edit profile</Link>
                </div>
              </section>
            </aside>
          </div>

          <section className="card">
            <div className="section-head">
              <h2>Recent reports</h2>
              {total > 5 && (
                <Link className="section-head-link" to="/my">
                  View all
                </Link>
              )}
            </div>
            {recent.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon" aria-hidden="true">
                  ⓘ
                </span>
                <h2>No reports yet</h2>
                <p>When you report a local issue, it will show up here with its live status.</p>
                <Link className="btn btn-primary" to="/report">
                  Report an issue
                </Link>
              </div>
            ) : (
              <ul className="activity-list">
                {recent.map((complaint) => (
                  <li key={complaint.id}>
                    <Link to={`/complaints/${complaint.id}`} className="activity-item">
                      <span className="activity-main">
                        <span className="activity-title">{complaint.title}</span>
                        <span className="activity-meta muted">
                          <span className="chip">{categoryLabel(complaint.category)}</span>
                          {complaint.location_label && <span>{complaint.location_label}</span>}
                          <span>{relativeTime(complaint.created_at)}</span>
                        </span>
                      </span>
                      <StatusBadge status={complaint.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
