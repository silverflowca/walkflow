// ============================================================
// PrayerMap — /api/prayer-map/walks/:walkId/path-points
// ============================================================

import { Hono } from 'hono'
import { supabase } from '../db/client.js'
import { emitPathPoint } from '../lib/wss.js'

const router = new Hono()

// ── POST /walks/:walkId/path-points — add waypoint ───────────

router.post('/:walkId/path-points', async (c) => {
  const walkId = c.req.param('walkId')
  const body   = await c.req.json()

  if (body.lat == null || body.lng == null || body.seq == null) {
    return c.json({ error: 'lat, lng, seq are required' }, 400)
  }

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_path_points')
    .insert({
      walk_id:    walkId,
      seq:        body.seq,
      lat:        body.lat,
      lng:        body.lng,
      accuracy_m: body.accuracy_m ?? null,
      altitude_m: body.altitude_m ?? null,
    })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  emitPathPoint(walkId, data as Record<string, unknown>)
  return c.json(data, 201)
})

// ── GET /walks/:walkId/path-points — all points for walk ─────

router.get('/:walkId/path-points', async (c) => {
  const walkId = c.req.param('walkId')

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_path_points')
    .select('*')
    .eq('walk_id', walkId)
    .order('seq', { ascending: true })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ points: data ?? [] })
})

// ── GET /walks/:walkId/path-stats ────────────────────────────

router.get('/:walkId/path-stats', async (c) => {
  const walkId = c.req.param('walkId')

  const { data: pts, error } = await supabase
    .schema('d2flow')
    .from('pm_path_points')
    .select('lat, lng, recorded_at')
    .eq('walk_id', walkId)
    .order('seq', { ascending: true })

  if (error) return c.json({ error: error.message }, 500)

  const points = pts ?? []
  let distanceM = 0
  for (let i = 1; i < points.length; i++) {
    distanceM += haversine(
      +points[i-1].lat, +points[i-1].lng,
      +points[i].lat,   +points[i].lng,
    )
  }

  const durationS = points.length > 1
    ? (new Date(points.at(-1)!.recorded_at).getTime() - new Date(points[0].recorded_at).getTime()) / 1000
    : 0

  const bbox = points.length > 0 ? {
    minLat: Math.min(...points.map(p => +p.lat)),
    minLng: Math.min(...points.map(p => +p.lng)),
    maxLat: Math.max(...points.map(p => +p.lat)),
    maxLng: Math.max(...points.map(p => +p.lng)),
  } : null

  return c.json({
    pointCount: points.length,
    distanceM:  Math.round(distanceM),
    durationS:  Math.round(durationS),
    bbox,
  })
})

// ── Haversine ─────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R  = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default router
