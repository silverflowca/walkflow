// ============================================================
// PrayerMap — /api/prayer-map/entries
// ============================================================

import { Hono } from 'hono'
import { supabase } from '../db/client.js'
import { emitEntryCreated, emitEntryUpdated } from '../lib/wss.js'

const router = new Hono()

// ── POST /entries — create prayer entry ──────────────────────

router.post('/', async (c) => {
  const userId = c.get('userId') as string
  const body   = await c.req.json()

  if (body.lat == null || body.lng == null) {
    return c.json({ error: 'lat and lng are required' }, 400)
  }

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .insert({
      walk_id:    body.walk_id    ?? null,
      user_id:    userId,
      lat:        body.lat,
      lng:        body.lng,
      accuracy_m: body.accuracy_m ?? null,
      type:       body.type       ?? 'note',
      title:      body.title      ?? null,
      body:       body.body       ?? null,
      tags:       body.tags       ?? [],
    })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  emitEntryCreated(data as Record<string, unknown>)
  return c.json(data, 201)
})

// ── GET /entries — list entries for current user ─────────────

router.get('/', async (c) => {
  const userId  = c.get('userId') as string
  const walkId  = c.req.query('walk_id')
  const type    = c.req.query('type')
  const limit   = Math.min(parseInt(c.req.query('limit') ?? '100'), 500)
  const offset  = parseInt(c.req.query('offset') ?? '0')

  let q = supabase
    .schema('d2flow')
    .from('pm_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (walkId) q = q.eq('walk_id', walkId)
  if (type)   q = q.eq('type', type)

  const { data, error } = await q

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ entries: data ?? [], offset, limit })
})

// ── GET /entries/:id — single entry ─────────────────────────

router.get('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id     = c.req.param('id')

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .select('*, pm_entry_media(*)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

// ── PATCH /entries/:id — update entry ────────────────────────

router.patch('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id     = c.req.param('id')
  const body   = await c.req.json()

  const allowed = ['title', 'body', 'type', 'tags', 'ai_summary']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  emitEntryUpdated(data as Record<string, unknown>)
  return c.json(data)
})

// ── DELETE /entries/:id ───────────────────────────────────────

router.delete('/:id', async (c) => {
  const userId = c.get('userId') as string
  const id     = c.req.param('id')

  const { error } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

// ── GET /entries/nearby — spatial proximity search ───────────

router.get('/nearby', async (c) => {
  const userId  = c.get('userId') as string
  const lat     = parseFloat(c.req.query('lat') ?? '')
  const lng     = parseFloat(c.req.query('lng') ?? '')
  const radiusM = parseFloat(c.req.query('radius_m') ?? '500')

  if (isNaN(lat) || isNaN(lng)) {
    return c.json({ error: 'lat and lng query params required' }, 400)
  }

  // Rough bounding-box pre-filter (1 degree ≈ 111 km)
  const latDelta = radiusM / 111000
  const lngDelta = radiusM / (111000 * Math.cos(lat * Math.PI / 180))

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)

  if (error) return c.json({ error: error.message }, 500)

  // Exact haversine filter
  const entries = (data ?? []).filter((e: { lat: number; lng: number }) =>
    haversine(lat, lng, +e.lat, +e.lng) <= radiusM
  )

  return c.json({ entries })
})

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
