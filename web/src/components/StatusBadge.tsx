import { STATUS_LABELS, type Status } from '../lib/types'

export function StatusBadge({ status }: { status: string }) {
  const known = status in STATUS_LABELS ? (status as Status) : null
  return <span className={`badge badge-${status}`}>{known ? STATUS_LABELS[known] : status}</span>
}
