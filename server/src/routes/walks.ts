// ============================================================
// PrayerMap — /api/prayer-map/walks
// ============================================================

import { Hono } from 'hono'
import { supabase } from '../db/client.js'
import { emitWalkEnded } from '../lib/wss.js'

const router = new Hono()

// ── GET /walks ───────────────────────────────────────────────

router.get('/', async (c) => {
  const userId = c.get('userId') as string
  const { limit = '20', offset = '0' } = c.req.query()

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_walks')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .range(+offset, +offset + +limit - 1)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ walks: data ?? [] })
})

// ── POST /walks — start a walk ───────────────────────────────

router.post('/', async (c) => {
  const userId = c.get('userId') as string
  const body   = await c.req.json().catch(() => ({}))

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_walks')
    .insert({ user_id: userId, title: body.title ?? null })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

// ── PATCH /walks/:id — end or update ────────────────────────

router.patch('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id     = c.req.param('id')
  const body   = await c.req.json().catch(() => ({}))

  const updates: Record<string, unknown> = {}
  if (body.title     !== undefined) updates.title      = body.title
  if (body.ended     === true)      updates.ended_at   = new Date().toISOString()
  if (body.ended_at  !== undefined) updates.ended_at   = body.ended_at

  // If ending: compute distance and bbox from path points
  if (updates.ended_at) {
    const { data: pts } = await supabase
      .schema('d2flow')
      .from('pm_path_points')
      .select('lat, lng')
      .eq('walk_id', id)
      .order('seq', { ascending: true })

    if (pts && pts.length > 1) {
      let dist = 0
      for (let i = 1; i < pts.length; i++) {
        dist += haversine(pts[i-1].lat, pts[i-1].lng, pts[i].lat, pts[i].lng)
      }
      updates.distance_m = Math.round(dist)
      updates.bbox = {
        minLat: Math.min(...pts.map(p => p.lat)),
        minLng: Math.min(...pts.map(p => p.lng)),
        maxLat: Math.max(...pts.map(p => p.lat)),
        maxLng: Math.max(...pts.map(p => p.lng)),
      }
    }
  }

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_walks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  if (!data)  return c.json({ error: 'Not found' }, 404)

  if (updates.ended_at) emitWalkEnded(data as Record<string, unknown>)
  return c.json(data)
})

// ── DELETE /walks/:id ────────────────────────────────────────

router.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id     = c.req.param('id')

  const { error } = await supabase
    .schema('d2flow')
    .from('pm_walks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ deleted: true })
})

// ── Haversine (metres) ───────────────────────────────────────

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
