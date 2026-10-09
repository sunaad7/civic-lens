import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { LocationSearch } from '../../components/LocationSearch'
import { MapPicker, type FlyTarget, type Pin } from '../../components/MapPicker'
import { VoiceInput } from '../../components/VoiceInput'
import { apiFetch } from '../../lib/api'
import { compressImage, MAX_TOTAL_UPLOAD_BYTES } from '../../lib/image'
import { CATEGORIES, CATEGORY_LABELS, type ComplaintDetail, type GeoResult } from '../../lib/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const reportSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Describe the issue in at least 10 characters').max(5000),
  category: z.enum(CATEGORIES),
  location_label: z.string().max(300),
})

export function ReportPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('roads')
  const [locationLabel, setLocationLabel] = useState('')
  const [pin, setPin] = useState<Pin | null>(null)
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')

  const onLocationPicked = (result: GeoResult) => {
    const next = { lat: result.lat, lng: result.lng }
    setPin(next)
    setFlyTo({ pin: next, tick: Date.now() })
    setLocationLabel((prev) => (prev.trim() ? prev : result.label))
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0)
  const tooLarge = totalBytes > MAX_TOTAL_UPLOAD_BYTES

  const addFiles = async (incoming: File[]) => {
    if (!incoming.length) return
    setError('')
    const compressed = await Promise.all(incoming.map((file) => compressImage(file)))
    const next = [...files, ...compressed].slice(0, 5)
    setFiles(next)
    if (next.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_UPLOAD_BYTES) {
      setError('Total photo size exceeds 4 MB. Remove a photo or choose smaller ones.')
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = reportSchema.safeParse({ title, description, category, location_label: locationLabel })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Check the form fields')
      if (!pin) throw new Error('Pick the issue location on the map')

      const form = new FormData()
      form.set('title', parsed.data.title)
      form.set('description', parsed.data.description)
      form.set('category', parsed.data.category)
      form.set('lat', String(pin.lat))
      form.set('lng', String(pin.lng))
      if (parsed.data.location_label) form.set('location_label', parsed.data.location_label)
      for (const file of files) form.append('images', file)

      return apiFetch<ComplaintDetail>('/complaints', { method: 'POST', body: form })
    },
    onSuccess: (complaint) => {
      queryClient.invalidateQueries({ queryKey: ['my-complaints'] })
      navigate(`/complaints/${complaint.id}`)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Submission failed'),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    mutation.mutate()
  }

  return (
    <div className="page page-form">
      <header className="page-header">
        <span className="page-eyebrow">New report</span>
        <h1>Report an issue</h1>
        <p className="muted">
          Describe the problem, drop a pin where it is, and attach photos. Voice dictation is available on the
          description field.
        </p>
      </header>

      <form className="card form-grid" onSubmit={onSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <label className="field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Deep pothole near the bus stop"
            maxLength={200}
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What is wrong, how long has it been like this, why does it matter?"
            maxLength={5000}
            required
          />
          <VoiceInput value={description} onChange={setDescription} />
        </label>

        <div className="section-head mt-4">
          <h2>Category &amp; place</h2>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Location label (optional)</span>
            <input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="e.g. Main St & 2nd Ave"
              maxLength={300}
            />
          </label>
        </div>

        <div className="section-head mt-4">
          <h2>Location</h2>
        </div>

        <div className="field">
          <span>Search for a place, or click the map to drop a pin</span>
          <LocationSearch onSelect={onLocationPicked} />
          <MapPicker value={pin} onChange={setPin} flyTo={flyTo} />
          <div className="pin-readout">
            {pin ? (
              <>
                <code>
                  {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                </code>
                <button type="button" className="btn btn-ghost" onClick={() => setPin(null)}>
                  Clear pin
                </button>
              </>
            ) : (
              <span className="muted">No location selected yet.</span>
            )}
          </div>
        </div>

        <div className="section-head mt-4">
          <h2>Photos</h2>
        </div>

        <div className="field">
          <span>Attach evidence (optional)</span>
          <div className="photo-inputs">
            <label className="btn btn-secondary file-btn">
              Take photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void addFiles([file])
                  e.target.value = ''
                }}
              />
            </label>
            <label className="btn btn-secondary file-btn">
              Add from gallery
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  void addFiles(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {files.length > 0 && (
            <ul className="file-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  {f.name} <span className="muted">({formatBytes(f.size)})</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {files.length > 0 && (
          <p className={tooLarge ? 'field-hint field-hint-error' : 'field-hint'}>
            {formatBytes(totalBytes)} of 4 MB used
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={mutation.isPending || tooLarge}
        >
          {mutation.isPending ? 'Submitting…' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
