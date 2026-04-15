// ── Leaflet map view ──────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PathPoint, Entry, Walk } from '../lib/types.js'
import type { GpsPosition } from '../hooks/useGPS.js'
import { useTheme } from '../context/ThemeContext.js'

interface Props {
  points:       PathPoint[]
  entries:      Entry[]
  walks?:       Walk[]
  position:     GpsPosition | null
  flyToEntry?:  Entry | null
  onMapClick?:  (lat: number, lng: number) => void
  onAudioOpen?: (entry: Entry) => void
}

function hasPfAudio(entry: Entry): boolean {
  if (!entry.ai_summary) return false
  try { return !!(JSON.parse(entry.ai_summary) as { pf_audio?: string }).pf_audio } catch { return false }
}

const ALL_TYPES = ['prayer', 'praise', 'intercession', 'burden', 'note'] as const
type EntryType = typeof ALL_TYPES[number]

const TYPE_EMOJI: Record<string, string> = {
  prayer: '🙏', praise: '🎉', intercession: '⚔️', burden: '💔', note: '📝',
}

export function MapView({ points, entries, walks = [], position, flyToEntry, onMapClick, onAudioOpen }: Props) {
  const { theme } = useTheme()

  const ENTRY_COLOURS: Record<string, string> = {
    prayer:       theme.prayer,
    praise:       theme.praise,
    intercession: theme.intercession,
    burden:       theme.burden,
    note:         theme.note,
  }

  const containerRef    = useRef<HTMLDivElement>(null)
  const mapRef          = useRef<ReturnType<typeof L.map> | null>(null)
  const tileLayerRef    = useRef<ReturnType<typeof L.tileLayer> | null>(null)
  const polylineRef     = useRef<ReturnType<typeof L.polyline> | null>(null)
  const posMarkerRef    = useRef<ReturnType<typeof L.circleMarker> | null>(null)
  const entryMarkersRef = useRef<Map<string, ReturnType<typeof L.circleMarker>>>(new Map())

  // Legend / filter state
  const [showLegend,   setShowLegend]   = useState(false)
  const [activeTypes,  setActiveTypes]  = useState<Set<EntryType>>(new Set(ALL_TYPES))
  const [filterWalkId, setFilterWalkId] = useState<string | 'all'>('all')

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center:      [43.65107, -79.347015],
      zoom:        15,
      zoomControl: false,
    })
    tileLayerRef.current = L.tileLayer(theme.tileUrl, {
      attribution: theme.tileAttr,
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)
    map.on('click', (e) => onMapClick?.(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fly to entry when requested from list view
  useEffect(() => {
    const map = mapRef.current
    if (!map || !flyToEntry) return
    map.flyTo([+flyToEntry.lat, +flyToEntry.lng], 17, { animate: true, duration: 0.8 })
    const marker = entryMarkersRef.current.get(flyToEntry.id)
    if (marker) setTimeout(() => marker.openPopup(), 900)
  }, [flyToEntry])

  // Update path polyline
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const latlngs = points.map(p => [+p.lat, +p.lng] as [number, number])
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latlngs)
    } else {
      polylineRef.current = L.polyline(latlngs, { color: theme.accent, weight: 4, opacity: 0.8 }).addTo(map)
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

  // Update entry markers based on current filter
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const visibleIds = new Set(
      entries
        .filter(e =>
          activeTypes.has(e.type as EntryType) &&
          (filterWalkId === 'all' || e.walk_id === filterWalkId)
        )
        .map(e => e.id)
    )

    // Add new markers
    for (const e of entries) {
      if (!entryMarkersRef.current.has(e.id)) {
        const colour = ENTRY_COLOURS[e.type] ?? theme.note
        const hasAudio = hasPfAudio(e)
        const audioLink = hasAudio
          ? `<br/><a href="#" data-entry-id="${e.id}" style="color:${theme.accent};font-size:12px;text-decoration:none;">🎙 Audio</a>`
          : ''
        const marker = L.circleMarker([+e.lat, +e.lng], {
          radius: 9, color: '#fff', weight: 2,
          fillColor: colour, fillOpacity: 0.9,
        })
          .bindPopup(`<b>${e.title ?? e.type}</b>${e.body ? `<br/>${e.body.slice(0, 80)}` : ''}${audioLink}`)
        entryMarkersRef.current.set(e.id, marker)
      }
    }

    // Show/hide based on filter
    for (const [id, marker] of entryMarkersRef.current) {
      if (!entries.some(e => e.id === id)) {
        marker.remove()
        entryMarkersRef.current.delete(id)
        continue
      }
      if (visibleIds.has(id)) {
        if (!map.hasLayer(marker)) marker.addTo(map)
      } else {
        if (map.hasLayer(marker)) marker.remove()
      }
    }
  }, [entries, activeTypes, filterWalkId])

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

  const toggleType = (t: EntryType) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  const filterLabel = (() => {
    const typeLabel = activeTypes.size < ALL_TYPES.length ? `${activeTypes.size} types` : ''
    const walkLabel = filterWalkId !== 'all'
      ? (walks.find(w => w.id === filterWalkId)?.title ?? 'Walk')
      : ''
    if (typeLabel && walkLabel) return `${walkLabel} · ${typeLabel}`
    return typeLabel || walkLabel || 'All Pins'
  })()

  return (
    <div style={{ flex: 1, width: '100%', position: 'relative' }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend toggle button */}
      <button
        onClick={() => setShowLegend(v => !v)}
        style={{
          position: 'absolute', top: 14, left: 14, zIndex: 900,
          background: theme.bgSheet,
          border: `1px solid ${showLegend ? theme.accent + '66' : theme.border}`,
          borderRadius: 12, padding: '7px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', backdropFilter: 'blur(10px)',
          color: theme.textPrimary, fontSize: 12, fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
          transition: 'border-color 0.15s',
          fontFamily: 'inherit',
        }}
      >
        <span>🗂</span>
        <span style={{ color: theme.textSecondary }}>{filterLabel}</span>
      </button>

      {/* Legend / filter panel */}
      {showLegend && (
        <div
          style={{
            position: 'absolute', top: 52, left: 14, zIndex: 900,
            background: theme.bgSheet,
            border: `1px solid ${theme.border}`,
            borderRadius: 16, padding: '14px',
            width: 230,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}
        >
          {/* Pin type filter */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: theme.textMuted, marginBottom: 8 }}>
              PIN TYPE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ALL_TYPES.map(t => {
                const on = activeTypes.has(t)
                const color = ENTRY_COLOURS[t]
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 10,
                      border: `1px solid ${on ? color + '55' : theme.border}`,
                      background: on ? color + '15' : theme.bgCard,
                      cursor: 'pointer', opacity: on ? 1 : 0.4,
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: color,
                      boxShadow: on ? `0 0 0 3px ${color}35` : 'none',
                    }} />
                    <span style={{ fontSize: 13, color: theme.textPrimary, flex: 1, textAlign: 'left' }}>
                      {TYPE_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                    {on && <span style={{ fontSize: 11, color }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Prayer walk filter */}
          {walks.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: theme.textMuted, marginBottom: 8 }}>
                PRAYER WALK
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <button
                  onClick={() => setFilterWalkId('all')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', borderRadius: 10,
                    border: `1px solid ${filterWalkId === 'all' ? theme.accent + '55' : theme.border}`,
                    background: filterWalkId === 'all' ? theme.accentMuted : theme.bgCard,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 12, color: theme.textPrimary, flex: 1, textAlign: 'left' }}>🗺 All Walks</span>
                  {filterWalkId === 'all' && <span style={{ fontSize: 11, color: theme.accent }}>✓</span>}
                </button>
                {walks.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setFilterWalkId(w.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 10,
                      border: `1px solid ${filterWalkId === w.id ? theme.accent + '55' : theme.border}`,
                      background: filterWalkId === w.id ? theme.accentMuted : theme.bgCard,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{
                      fontSize: 12, flex: 1, textAlign: 'left',
                      color: !w.ended_at ? theme.prayer : theme.textSecondary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {!w.ended_at ? '🟢 ' : '🚶 '}{w.title ?? 'Untitled Walk'}
                    </span>
                    {filterWalkId === w.id && <span style={{ fontSize: 11, color: theme.accent }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLegend(false)}
            style={{
              padding: '7px 0', borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: theme.bgCard, cursor: 'pointer',
              fontSize: 12, color: theme.textMuted, fontFamily: 'inherit',
            }}
          >Done</button>
        </div>
      )}
    </div>
  )
}
