// ── Leaflet map view ──────────────────────────────────────────

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PathPoint, Entry, GpsPosition as GpsPosType } from '../lib/types.js'
import type { GpsPosition } from '../hooks/useGPS.js'

// Custom DOM event fired when user clicks 🎙 Audio in a Leaflet popup
export const AUDIO_OPEN_EVENT = 'prayermap:audioopen'

interface Props {
  points:      PathPoint[]
  entries:     Entry[]
  position:    GpsPosition | null
  onMapClick?: (lat: number, lng: number) => void
  onAudioOpen?: (entry: Entry) => void
}

const ENTRY_COLOURS: Record<string, string> = {
  note:         '#7986cb',
  prayer:       '#81c784',
  intercession: '#ff8a65',
  praise:       '#ffd54f',
  burden:       '#ef5350',
}

function hasPfAudio(entry: Entry): boolean {
  if (!entry.ai_summary) return false
  try { return !!(JSON.parse(entry.ai_summary) as { pf_audio?: string }).pf_audio } catch { return false }
}

export function MapView({ points, entries, position, onMapClick, onAudioOpen }: Props) {
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
        const hasAudio = hasPfAudio(e)
        const audioLink = hasAudio
          ? `<br/><a href="#" data-entry-id="${e.id}" style="color:#7986cb;font-size:12px;text-decoration:none;">🎙 Audio</a>`
          : ''
        const marker = L.circleMarker([+e.lat, +e.lng], {
          radius: 9, color: '#fff', weight: 2,
          fillColor: colour, fillOpacity: 0.9,
        })
          .bindPopup(`<b>${e.title ?? e.type}</b>${e.body ? `<br/>${e.body.slice(0, 80)}` : ''}${audioLink}`)
          .addTo(map)
        entryMarkersRef.current.set(e.id, marker)
      }
    }
    // Remove markers for deleted entries
    for (const [id, marker] of entryMarkersRef.current) {
      if (!seen.has(id)) { marker.remove(); entryMarkersRef.current.delete(id) }
    }
  }, [entries])

  // Handle audio link clicks inside Leaflet popups (delegated)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !onAudioOpen) return
    const handler = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement
      const entryId = target.getAttribute?.('data-entry-id')
      if (!entryId) return
      ev.preventDefault()
      const entry = entries.find(e => e.id === entryId)
      if (entry) onAudioOpen(entry)
    }
    container.addEventListener('click', handler)
    return () => container.removeEventListener('click', handler)
  }, [entries, onAudioOpen])

  return (
    <div ref={containerRef} style={{ flex: 1, width: '100%' }} />
  )
}
