import { useEffect, useRef, useState } from 'react'
import type { GeoResult } from '../lib/types'

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  name?: string
}

const NOMINATIM = 'https://nominatim.openstreetmap.org'

function toGeoResult(raw: NominatimResult): GeoResult {
  const lat = Number(raw.lat)
  const lng = Number(raw.lon)
  const label = (raw.name && raw.name !== raw.display_name ? raw.name : raw.display_name).slice(0, 300)
  return { lat, lng, label, display_name: raw.display_name }
}

export function LocationSearch({ onSelect }: { onSelect: (result: GeoResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [settledTerm, setSettledTerm] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)

  const term = query.trim()
  const searching = term.length >= 3 && settledTerm !== term

  useEffect(() => {
    if (term.length < 3) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const url = `${NOMINATIM}/search?format=jsonv2&limit=5&q=${encodeURIComponent(term)}`
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const rows = (await res.json()) as NominatimResult[]
        if (controller.signal.aborted) return
        setResults(rows.map(toGeoResult))
        setSettledTerm(term)
        setOpen(true)
        setMessage(rows.length === 0 ? 'No places found — try a different search.' : '')
      } catch (err) {
        if (controller.signal.aborted) return
        setResults([])
        setSettledTerm(term)
        setMessage(err instanceof Error ? err.message : 'Search failed')
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const pick = (result: GeoResult) => {
    setOpen(false)
    setMessage('')
    onSelect(result)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by this browser.')
      return
    }
    setLocating(true)
    setMessage('')
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        let label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        try {
          const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`, {
            headers: { Accept: 'application/json' },
          })
          if (res.ok) {
            const row = (await res.json()) as NominatimResult
            if (row.display_name) label = row.display_name.slice(0, 300)
          }
        } catch {
          // reverse geocoding is best-effort — coordinates still work
        }
        setLocating(false)
        setOpen(false)
        onSelect({ lat: latitude, lng: longitude, label, display_name: label })
      },
      (error) => {
        setLocating(false)
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied — search for a place instead.'
            : 'Could not read your location — search for a place instead.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="location-search" ref={containerRef}>
      <div className="location-search-row">
        <span className="search-wrap location-search-input">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0 && term.length >= 3) setOpen(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Search a place, address or landmark…"
            aria-label="Search location"
            autoComplete="off"
          />
        </span>
        <button type="button" className="btn btn-secondary" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>

      {message && <p className="location-search-message muted">{message}</p>}
      {searching && <p className="location-search-message muted">Searching…</p>}

      {open && term.length >= 3 && results.length > 0 && (
        <ul className="location-results" role="listbox">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button type="button" className="location-result" onClick={() => pick(result)}>
                <span className="location-result-name">{result.label}</span>
                <span className="location-result-detail muted">{result.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="location-search-credit muted">
        Geocoding © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </p>
    </div>
  )
}
