// ── Leaflet map view ──────────────────────────────────────────
// Uses Leaflet from CDN (declared globally below)

import { useEffect, useRef } from 'react'
import type { PathPoint, Entry, GpsPosition as GpsPosType } from '../lib/types.js'
import type { GpsPosition } from '../hooks/useGPS.js'

// Leaflet is loaded via CDN in index.html
declare const L: typeof import('leaflet')

interface Props {
  points:    PathPoint[]
  entries:   Entry[]
  position:  GpsPosition | null
  onMapClick?: (lat: number, lng: number) => void
}

const ENTRY_COLOURS: Record<string, string> = {
  note:         '#7986cb',
  prayer:       '#81c784',
  intercession: '#ff8a65',
  praise:       '#ffd54f',
  burden:       '#ef5350',
}

export function MapView({ points, entries, position, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<ReturnType<typeof L.map> | null>(null)
  const polylineRef  = useRef<ReturnType<typeof L.polyline> | null>(null)
  const posMarkerRef = useRef<ReturnType<typeof L.circleMarker> | null>(null)
  const entryMarkersRef = useRef<Map<string, ReturnType<typeof L.circleMarker>>>(new Map())

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center:    [43.65107, -79.347015],
      zoom:      15,
      zoomControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)

    map.on('click', (e) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update path polyline
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const latlngs = points.map(p => [+p.lat, +p.lng] as [number, number])
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs)
    } else {
      polylineRef.current = L.polyline(latlngs, { color: '#3f51b5', weight: 4, opacity: 0.8 }).addTo(map)
    }
    if (latlngs.length > 0) {
      map.panTo(latlngs[latlngs.length - 1], { animate: true, duration: 0.5 })
    }
  }, [points])

  // Update GPS dot
  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    const latlng: [number, number] = [position.lat, position.lng]
    if (posMarkerRef.current) {
      posMarkerRef.current.setLatLng(latlng)
    } else {
      posMarkerRef.current = L.circleMarker(latlng, {
        radius: 8, color: '#fff', weight: 2,
        fillColor: '#2196f3', fillOpacity: 1,
      }).addTo(map)
    }
  }, [position])

  // Update entry markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const seen = new Set<string>()
    for (const e of entries) {
      seen.add(e.id)
      if (!entryMarkersRef.current.has(e.id)) {
        const colour = ENTRY_COLOURS[e.type] ?? '#7986cb'
        const marker = L.circleMarker([+e.lat, +e.lng], {
          radius: 9, color: '#fff', weight: 2,
          fillColor: colour, fillOpacity: 0.9,
        })
          .bindPopup(`<b>${e.title ?? e.type}</b>${e.body ? `<br/>${e.body.slice(0, 80)}` : ''}`)
          .addTo(map)
        entryMarkersRef.current.set(e.id, marker)
      }
    }
    // Remove markers for deleted entries
    for (const [id, marker] of entryMarkersRef.current) {
      if (!seen.has(id)) { marker.remove(); entryMarkersRef.current.delete(id) }
    }
  }, [entries])

  return (
    <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
  )
}
