import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ComplaintMap } from '../../components/ComplaintMap'
import { ComplaintId } from '../../components/ComplaintId'
import { StatusBadge } from '../../components/StatusBadge'
import { apiFetch } from '../../lib/api'
import { CATEGORY_LABELS, type Category, type ComplaintDetail } from '../../lib/types'

function categoryLabel(category: string): string {
  return category in CATEGORY_LABELS ? CATEGORY_LABELS[category as Category] : category
}

export function TriagePanel({ complaint }: { complaint: ComplaintDetail }) {
  const triage = complaint.ai_triage
  return (
    <section className="card">
      <div className="section-head">
        <h2>AI triage</h2>
        <span className="chip">Automated</span>
      </div>
      {!triage && <p className="muted">No triage yet — it runs automatically after submission.</p>}
      {triage && (
        <>
          <dl className="kv">
            <dt>Suggested category</dt>
            <dd>{categoryLabel(triage.category)}</dd>
            <dt>Severity</dt>
            <dd>{triage.severity} / 5</dd>
            <dt>Suggested department</dt>
            <dd>{triage.department}</dd>
            <dt>Confidence</dt>
            <dd>{Math.round(triage.confidence * 100)}%</dd>
            <dt>Model</dt>
            <dd>{triage.model}</dd>
          </dl>
          <p className="triage-summary">{triage.summary}</p>
        </>
      )}
    </section>
  )
}

export function EventsTimeline({ complaint }: { complaint: ComplaintDetail }) {
  return (
    <section className="card">
      <div className="section-head">
        <h2>History</h2>
      </div>
      <ol className="timeline">
        {complaint.events.map((event) => (
          <li key={event.id}>
            <div className="timeline-head">
              <strong className="timeline-type">{event.event_type.replace(/_/g, ' ')}</strong>
              <span className="muted">{new Date(event.created_at).toLocaleString()}</span>
            </div>
            {event.actor_name && <div className="muted">by {event.actor_name}</div>}
            {event.payload && <pre className="payload">{JSON.stringify(event.payload, null, 2)}</pre>}
          </li>
        ))}
      </ol>
    </section>
  )
}

export function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => apiFetch<ComplaintDetail>(`/complaints/${id}`),
    enabled: Boolean(id),
  })

  if (isLoading) return <div className="spinner" aria-label="Loading" />
  if (error) return <div className="alert alert-error">{error instanceof Error ? error.message : 'Failed to load'}</div>
  if (!data) return null

  return (
    <div className="page">
      <Link to="/my" className="back-link">
        ← Back to my complaints
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
          <span className="chip">{categoryLabel(data.category)}</span>
          <span>{new Date(data.created_at).toLocaleString()}</span>
          {data.location_label && (
            <>
              <span aria-hidden="true">·</span>
              <span className="chip">{data.location_label}</span>
            </>
          )}
        </p>
      </header>

      <div className="detail-grid">
        <section className="card">
          <div className="section-head">
            <h2>Description</h2>
          </div>
          <p className="prewrap">{data.description}</p>
          <div className="section-head mt-6">
            <h2>Location</h2>
          </div>
          <ComplaintMap lat={data.location.lat} lng={data.location.lng} label={data.location_label} />
          <p className="muted mt-3">
            <code>
              {data.location.lat.toFixed(5)}, {data.location.lng.toFixed(5)}
            </code>
          </p>
        </section>

        <div className="detail-stack">
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
      </div>
    </div>
  )
}
