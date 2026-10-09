import { useEffect, useRef, useState } from 'react'

export function ComplaintId({ id, full = false }: { id: string; full?: boolean }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable (insecure context) — the id stays selectable in the chip
    }
  }

  return (
    <button
      type="button"
      className={`complaint-id${copied ? ' is-copied' : ''}`}
      onClick={copy}
      title={`Copy complaint ID: ${id}`}
      aria-label={`Complaint ID ${id}, click to copy`}
    >
      <span className="complaint-id-label">ID</span>
      <code className={`complaint-id-value${full ? ' is-full' : ''}`}>{full ? id : `${id.slice(0, 8)}…`}</code>
      <span className="complaint-id-action">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
