import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { DEFAULT_CENTER, pinIcon } from '../lib/map'

export interface Pin {
  lat: number
  lng: number
}

export interface FlyTarget {
  pin: Pin
  tick: number
}

function ClickHandler({ onPick }: { onPick: (pin: Pin) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })
  return null
}

function FlyTo({ target }: { target: FlyTarget }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([target.pin.lat, target.pin.lng], Math.max(map.getZoom(), 15), { duration: 0.7 })
  }, [map, target])
  return null
}

interface MapPickerProps {
  value: Pin | null
  onChange: (pin: Pin) => void
  flyTo?: FlyTarget | null
}

export function MapPicker({ value, onChange, flyTo }: MapPickerProps) {
  const center: [number, number] = value ? [value.lat, value.lng] : DEFAULT_CENTER
  return (
    <MapContainer center={center} zoom={14} className="map-container" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      {flyTo && <FlyTo target={flyTo} />}
      {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
    </MapContainer>
  )
}
