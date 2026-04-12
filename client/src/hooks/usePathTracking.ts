// ── Path tracking — posts GPS points every 15 s during a walk ─

import { useEffect, useRef, useCallback, useState } from 'react'
import { path as pathApi } from '../lib/api.js'
import type { PathPoint } from '../lib/types.js'
import type { GpsPosition } from './useGPS.js'

const INTERVAL_MS = 15_000

interface UsePathTrackingReturn {
  points:     PathPoint[]
  addPoint:   (pos: GpsPosition) => Promise<void>
  clearPoints: () => void
}

export function usePathTracking(
  walkId:   string | null,
  position: GpsPosition | null,
  active:   boolean,
): UsePathTrackingReturn {
  const [points, setPoints] = useState<PathPoint[]>([])
  const seqRef  = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const addPoint = useCallback(async (pos: GpsPosition) => {
    if (!walkId) return
    seqRef.current += 1
    try {
      const pt = await pathApi.add(walkId, {
        lat:        pos.lat,
        lng:        pos.lng,
        seq:        seqRef.current,
        accuracy_m: pos.accuracy_m,
        altitude_m: pos.altitude_m ?? undefined,
      })
      setPoints(prev => [...prev, pt])
    } catch {
      // network hiccup — keep trying on next interval
    }
  }, [walkId])

  const clearPoints = useCallback(() => {
    setPoints([])
    seqRef.current = 0
  }, [])

  // Post a point on first GPS fix and then every 15 s
  const posRef = useRef<GpsPosition | null>(position)
  posRef.current = position

  useEffect(() => {
    if (!active || !walkId) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      return
    }

    // Immediately post first point when position available
    if (posRef.current) addPoint(posRef.current)

    timerRef.current = setInterval(() => {
      if (posRef.current) addPoint(posRef.current)
    }, INTERVAL_MS)

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }, [active, walkId, addPoint])

  return { points, addPoint, clearPoints }
}
