import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ComplaintMap } from '../../components/ComplaintMap'
import { ComplaintId } from '../../components/ComplaintId'
import { StatusBadge } from '../../components/StatusBadge'
import { ApiError, apiFetch } from '../../lib/api'
import { STATUSES, STATUS_LABELS, type ComplaintDetail, type Status, type User } from '../../lib/types'
import { EventsTimeline, TriagePanel } from '../citizen/ComplaintDetailPage'

export function AdminDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [letter, setLetter] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const complaint = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => apiFetch<ComplaintDetail>(`/admin/complaints/${id}`),
    enabled: Boolean(id),
  })

  const admins = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<User[]>('/admin/users'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['complaint', id] })

  const statusMutation = useMutation({
    mutationFn: (next: string) =>
      apiFetch<ComplaintDetail>(`/admin/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next, note: note || undefined }),
      }),
    onSuccess: () => {
      setMessage('')
      setNote('')
      invalidate()
    },
    onError: (err) => setMessage(err instanceof ApiError ? err.message : 'Status update failed'),
  })

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string) =>
      apiFetch<ComplaintDetail>(`/admin/complaints/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_id: assigneeId }),
      }),
    onSuccess: () => {
      setMessage('')
      invalidate()
    },
    onError: (err) => setMessage(err instanceof ApiError ? err.message : 'Assignment failed'),
  })

  const letterQuery = useQuery({
    queryKey: ['admin-letter', id],
    queryFn: () => apiFetch<{ letter: string }>(`/admin/complaints/${id}/letter`),
    enabled: false,
    staleTime: Infinity,
  })

  const requestLetter = async () => {
    const result = await letterQuery.refetch()
    if (result.data) setLetter(result.data.letter)
  }

  const speakLetter = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  if (complaint.isLoading) return <div className="spinner" aria-label="Loading" />
  if (complaint.error) {
    return (
      <div className="alert alert-error">
        {complaint.error instanceof Error ? complaint.error.message : 'Failed to load'}
      </div>
    )
  }
  const data = complaint.data
  if (!data) return null

  const currentStatus = data.status as Status
  const nextStatuses = STATUSES.filter((s) => s !== currentStatus)

  return (
    <div className="page">
      <Link to="/admin" className="back-link">
        ← Back to queue
      </Link>

      <header className="page-header">
        <div className="card-row">
          <h1>{data.title}</h1>
          <div className="header-badges">
            <ComplaintId id={data.id} full />
            <StatusBadge status={data.status} />
          </div>
        </div>
        <p className="card-meta muted">
          <span>by {data.reporter?.name ?? 'Unknown'}</span>
          <span aria-hidden="true">·</span>
          <span>{new Date(data.created_at).toLocaleString()}</span>
          {data.location_label && (
            <>
              <span aria-hidden="true">·</span>
              <span className="chip">{data.location_label}</span>
            </>
          )}
        </p>
      </header>

      {message && <div className="alert alert-error">{message}</div>}

      <div className="detail-grid">
        <div className="detail-stack">
          <section className="card">
            <div className="section-head">
              <h2>Description</h2>
            </div>
            <p className="prewrap">{data.description}</p>
            <div className="section-head mt-6">
              <h2>Location</h2>
            </div>
            <ComplaintMap lat={data.location.lat} lng={data.location.lng} label={data.location_label} />
          </section>

          {data.images.length > 0 && (
            <section className="card">
              <div className="section-head">
                <h2>Photos</h2>
              </div>
              <div className="image-grid">
                {data.images.map((image) => (
                  <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                    <img src={image.url} alt="Complaint evidence" loading="lazy" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <TriagePanel complaint={data} />
          <EventsTimeline complaint={data} />
        </div>

        <div className="detail-stack">
          <section className="card">
            <div className="section-head">
              <h2>Actions</h2>
            </div>

            <label className="field">
              <span>Move to status</span>
              <div className="field-row">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) statusMutation.mutate(e.target.value)
                  }}
                >
                  <option value="">Choose next status…</option>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={statusMutation.isPending}
                  onClick={() => {
                    const next = nextStatuses[0]
                    if (next) statusMutation.mutate(next)
                  }}
                >
                  Apply
                </button>
              </div>
            </label>

            <label className="field">
              <span>Note (optional, recorded in history)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Crew dispatched" />
            </label>

            <label className="field">
              <span>Assign to</span>
              <div className="field-row">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) assignMutation.mutate(e.target.value)
                  }}
                >
                  <option value="">Choose assignee…</option>
                  {admins.data?.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={assignMutation.isPending}
                  onClick={() => {
                    const first = admins.data?.[0]
                    if (first) assignMutation.mutate(first.id)
                  }}
                >
                  Assign first
                </button>
              </div>
              {data.assignee_name && <p className="muted">Currently assigned to {data.assignee_name}</p>}
            </label>
          </section>

          <section className="card">
            <div className="section-head">
              <h2>Official letter</h2>
            </div>
            {(letter || data.letter_draft) && (
              <div className="letter-box">
                <pre className="letter-text">{letter ?? data.letter_draft}</pre>
                <div className="field-row">
                  <button type="button" className="btn btn-secondary" onClick={() => speakLetter(letter ?? data.letter_draft ?? '')}>
                    Read aloud
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={stopSpeaking}>
                    Stop
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={requestLetter}
              disabled={letterQuery.isFetching}
            >
              {letterQuery.isFetching
                ? 'Drafting…'
                : letter || data.letter_draft
                  ? 'Refresh draft'
                  : 'Draft letter'}
            </button>
            {letterQuery.isError && <div className="alert alert-error">Letter drafting failed.</div>}
          </section>
        </div>
      </div>
    </div>
  )
}
