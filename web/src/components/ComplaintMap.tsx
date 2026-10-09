import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { pinIcon } from '../lib/map'

interface ComplaintMapProps {
  lat: number
  lng: number
  label?: string | null
}

export function ComplaintMap({ lat, lng, label }: ComplaintMapProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} className="map-container" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={pinIcon} alt={label ?? undefined} />
    </MapContainer>
  )
}
