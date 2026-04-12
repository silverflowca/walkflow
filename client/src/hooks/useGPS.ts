// ── GPS / Geolocation hook ────────────────────────────────────

import { useState, useEffect, useRef } from 'react'

export interface GpsPosition {
  lat:        number
  lng:        number
  accuracy_m: number
  altitude_m: number | null
}

interface UseGpsReturn {
  position:   GpsPosition | null
  error:      string | null
  watching:   boolean
}

export function useGPS(active: boolean): UseGpsReturn {
  const [position, setPosition] = useState<GpsPosition | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this device')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null)
        setPosition({
          lat:        pos.coords.latitude,
          lng:        pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          altitude_m: pos.coords.altitude,
        })
      },
      (err) => setError(err.message),
      {
        enableHighAccuracy: true,
        maximumAge:         5000,
        timeout:            15000,
      },
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [active])

  return { position, error, watching: active && watchIdRef.current != null }
}
