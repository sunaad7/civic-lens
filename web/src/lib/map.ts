import L from 'leaflet'

function parseCenter(raw: string | undefined): [number, number] {
  if (!raw) return [12.9716, 77.5946]
  const [lat, lng] = raw.split(',').map((n) => Number(n.trim()))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [12.9716, 77.5946]
  return [lat, lng]
}

export const DEFAULT_CENTER = parseCenter(import.meta.env.VITE_MAP_CENTER as string | undefined)

export const pinIcon = L.divIcon({
  className: 'map-pin',
  html: '<span class="map-pin-dot"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 18],
})
