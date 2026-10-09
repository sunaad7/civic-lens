import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge'
import { ComplaintId } from '../../components/ComplaintId'
import { apiFetch } from '../../lib/api'
import {
  CATEGORY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type AdminComplaintRow,
  type Category,
  type Status,
} from '../../lib/types'

function categoryLabel(category: string): string {
  return category in CATEGORY_LABELS ? CATEGORY_LABELS[category as Category] : category
}

export function AdminQueuePage() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [submittedQ, setSubmittedQ] = useState('')

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-complaints', status, submittedQ],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (submittedQ) params.set('q', submittedQ)
      const qs = params.toString()
      return apiFetch<AdminComplaintRow[]>(`/admin/complaints${qs ? `?${qs}` : ''}`)
    },
  })

  const onSearch = (event: FormEvent) => {
    event.preventDefault()
    setSubmittedQ(q.trim())
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-lead">
          <div>
            <span className="page-eyebrow">Admin</span>
            <h1>Complaint queue</h1>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <p className="muted">Triage incoming reports, assign owners, and draft official letters.</p>
      </header>

      <form className="filters" onSubmit={onSearch}>
        <label className="field field-inline">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s as Status]}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-inline">
          <span>Search</span>
          <span className="search-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="title, description or complaint ID…"
            />
          </span>
        </label>
        <button type="submit" className="btn btn-primary">
          Filter
        </button>
      </form>

      {isLoading && (
        <div className="card table-card" aria-busy="true">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Reporter</th>
                <th>Assignee</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((row) => (
                <tr key={row} className="is-skeleton" aria-hidden="true">
                  {Array.from({ length: 6 }).map((_, col) => (
                    <td key={col}>
                      <span className="skeleton" style={{ width: col === 0 ? '70%' : '50%' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && <div className="alert alert-error">{error instanceof Error ? error.message : 'Failed to load'}</div>}

      {data && data.length === 0 && (
        <div className="card empty-state">
          <span className="empty-icon" aria-hidden="true">
            ✓
          </span>
          <h2>No complaints found</h2>
          <p>Nothing matches these filters. Try clearing the status or search term.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setStatus('')
              setQ('')
              setSubmittedQ('')
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Reporter</th>
                <th>Assignee</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/admin/${row.id}`}>{row.title}</Link>
                    <div className="table-subid">
                      <ComplaintId id={row.id} />
                    </div>
                  </td>
                  <td>
                    <span className="chip">{categoryLabel(row.category)}</span>
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>{row.reporter_name ?? '—'}</td>
                  <td>
                    {row.assignee_name ?? <span className="muted">Unassigned</span>}
                  </td>
                  <td className="muted">{new Date(row.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
