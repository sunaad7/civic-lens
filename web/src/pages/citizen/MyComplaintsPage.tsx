import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge'
import { apiFetch } from '../../lib/api'
import { CATEGORY_LABELS, type Category, type ComplaintSummary } from '../../lib/types'

function categoryLabel(category: string): string {
  return category in CATEGORY_LABELS ? CATEGORY_LABELS[category as Category] : category
}

export function MyComplaintsPage() {
  const [q, setQ] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-complaints'],
    queryFn: () => apiFetch<ComplaintSummary[]>('/complaints'),
  })

  const term = q.trim().toLowerCase()
  const visible = data?.filter(
    (complaint) =>
      !term ||
      complaint.title.toLowerCase().includes(term) ||
      complaint.id.toLowerCase().includes(term) ||
      (complaint.location_label ?? '').toLowerCase().includes(term),
  )

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-lead">
          <div>
            <span className="page-eyebrow">Your reports</span>
            <h1>My complaints</h1>
          </div>
          <Link className="btn btn-primary" to="/report">
            Report an issue
          </Link>
        </div>
        <p className="muted">Everything you have reported, newest first.</p>
      </header>

      {isLoading && <div className="spinner" aria-label="Loading" />}
      {error && <div className="alert alert-error">{error instanceof Error ? error.message : 'Failed to load'}</div>}

      {data && data.length === 0 && (
        <div className="card empty-state">
          <span className="empty-icon" aria-hidden="true">
            ⓘ
          </span>
          <h2>No reports yet</h2>
          <p>You have not reported anything yet.</p>
          <Link className="btn btn-primary" to="/report">
            Report an issue
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="filters">
          <label className="field field-inline search-wide">
            <span>Search</span>
            <span className="search-wrap">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="title, place or complaint ID…"
                aria-label="Search my complaints"
              />
            </span>
          </label>
          {q && (
            <button type="button" className="btn btn-ghost" onClick={() => setQ('')}>
              Clear
            </button>
          )}
        </div>
      )}

      {visible && visible.length === 0 && data && data.length > 0 && (
        <div className="card empty-state">
          <span className="empty-icon" aria-hidden="true">
            ⌕
          </span>
          <h2>No matches</h2>
          <p>
            Nothing matches <strong>{q}</strong>. Try a title, place, or the complaint ID.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => setQ('')}>
            Clear search
          </button>
        </div>
      )}

      <div className="card-list">
        {visible?.map((complaint) => (
          <Link key={complaint.id} to={`/complaints/${complaint.id}`} className="card card-link">
            <div className="card-row">
              <h3>{complaint.title}</h3>
              <StatusBadge status={complaint.status} />
            </div>
            <div className="card-meta muted mt-1">
              <span className="chip">{categoryLabel(complaint.category)}</span>
              <code className="complaint-id-plain" title={complaint.id}>
                {complaint.id.slice(0, 8)}…
              </code>
              <span>{new Date(complaint.created_at).toLocaleString()}</span>
              {complaint.location_label && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{complaint.location_label}</span>
                </>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
