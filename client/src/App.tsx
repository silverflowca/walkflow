// ── App root ──────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react'
import { Layout, type AppTab }     from './components/Layout.js'
import { MapView }                 from './components/MapView.js'
import { WalkWidget }              from './components/WalkWidget.js'
import { EntryCapture }            from './components/EntryCapture.js'
import { ListView }                from './components/ListView.js'
import { PrayerAudioPlayer }       from './components/PrayerAudioPlayer.js'
import { ThemeChooser }            from './components/ThemeChooser.js'
import { WalkProvider, useWalkContext } from './context/WalkContext.js'
import { ThemeProvider, useTheme } from './context/ThemeContext.js'
import { useGPS }                  from './hooks/useGPS.js'
import { usePathTracking }         from './hooks/usePathTracking.js'
import { useWs }                   from './hooks/useWs.js'
import { entries as entriesApi, walks as walksApi } from './lib/api.js'
import type { Entry, Walk, WsEvent } from './lib/types.js'

// ── Dev: set a fake token so NO_AUTH=true server accepts requests
if (!localStorage.getItem('pm_token')) {
  localStorage.setItem('pm_token', 'dev-token')
}

function AppInner() {
  const { activeWalk } = useWalkContext()
  const { theme }      = useTheme()

  const [tab,           setTab]           = useState<AppTab>('map')
  const [showCapture,   setShowCapture]   = useState(false)
  const [showTheme,     setShowTheme]     = useState(false)
  const [pinLat,        setPinLat]        = useState<number | null>(null)
  const [pinLng,        setPinLng]        = useState<number | null>(null)
  const [entries,       setEntries]       = useState<Entry[]>([])
  const [walks,         setWalks]         = useState<Walk[]>([])
  const [walkSeconds,   setWalkSeconds]   = useState(0)
  const [audioEntry,    setAudioEntry]    = useState<Entry | null>(null)
  const [flyToEntry,    setFlyToEntry]    = useState<Entry | null>(null)

  const { position, error: gpsError } = useGPS(true)
  const { points, clearPoints }        = usePathTracking(activeWalk?.id ?? null, position, !!activeWalk)

  // Timer for walk HUD
  useEffect(() => {
    if (!activeWalk) { setWalkSeconds(0); return }
    const iv = setInterval(() => setWalkSeconds(s => s + 1), 1000)
    return () => clearInterval(iv)
  }, [activeWalk])

  // Clear path points when walk ends
  useEffect(() => {
    if (!activeWalk) clearPoints()
  }, [activeWalk, clearPoints])

  // Load existing entries + walks on mount
  useEffect(() => {
    entriesApi.list({ limit: 200 })
      .then(r => setEntries(r.entries))
      .catch(() => {})
    walksApi.list()
      .then(r => setWalks(r.walks))
      .catch(() => {})
  }, [])

  // WebSocket: append new entries / update existing
  const handleWs = useCallback((evt: WsEvent) => {
    if (evt.type === 'entry.created') {
      const entry = evt.payload.entry
      if (entry?.id) setEntries(prev => prev.some(e => e.id === entry.id) ? prev : [entry, ...prev])
    } else if (evt.type === 'entry.updated') {
      const entry = evt.payload.entry
      if (entry?.id) setEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
    } else if (evt.type === 'walk.ended') {
      const walk = evt.payload.walk
      if (walk?.id) setWalks(prev => prev.map(w => w.id === walk.id ? walk : w))
    }
  }, [])
  useWs(handleWs)

  // Map click → open pin capture at tapped location
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPinLat(lat)
    setPinLng(lng)
    setShowCapture(true)
  }, [])

  // List pin clicked → fly to it on the map
  const handleFlyToEntry = useCallback((entry: Entry) => {
    setFlyToEntry(entry)
    setTab('map')
    setTimeout(() => setFlyToEntry(null), 2000)
  }, [])

  const capturePosition = showCapture
    ? (pinLat != null && pinLng != null
        ? { lat: pinLat, lng: pinLng, accuracy_m: 0, altitude_m: null }
        : position)
    : position

  return (
    <>
      <Layout tab={tab} onTab={setTab} onTheme={() => setShowTheme(true)}>
        {tab === 'map' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {gpsError && (
              <div style={{
                position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
                zIndex: 800, background: '#c62828', color: '#fff',
                padding: '4px 12px', borderRadius: 20, fontSize: 12,
              }}>
                GPS: {gpsError}
              </div>
            )}
            <MapView
              points={points}
              entries={entries}
              walks={walks}
              position={position}
              flyToEntry={flyToEntry}
              onMapClick={handleMapClick}
              onAudioOpen={setAudioEntry}
            />
          </div>
        )}
        {tab === 'list' && (
          <ListView
            onAudioOpen={setAudioEntry}
            onFlyToEntry={handleFlyToEntry}
          />
        )}
      </Layout>

      <WalkWidget
        points={points}
        seconds={walkSeconds}
        onPin={() => { setPinLat(null); setPinLng(null); setShowCapture(true) }}
      />

      {showCapture && (
        <EntryCapture
          position={capturePosition}
          onSaved={(e) => setEntries(prev => [e, ...prev])}
          onClose={() => { setShowCapture(false); setPinLat(null); setPinLng(null) }}
        />
      )}

      {audioEntry && (
        <PrayerAudioPlayer
          entry={audioEntry}
          onClose={() => setAudioEntry(null)}
        />
      )}

      {showTheme && (
        <ThemeChooser onClose={() => setShowTheme(false)} />
      )}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <WalkProvider>
        <AppInner />
      </WalkProvider>
    </ThemeProvider>
  )
}
