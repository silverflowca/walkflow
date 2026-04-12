// ============================================================
// PrayerMap — /api/prayer-map/media
// ============================================================

import { Hono } from 'hono'
import { supabase } from '../db/client.js'

const router = new Hono()

const BUCKET  = 'prayermap-media'
const MAX_MB  = 50

// ── POST /media/upload — multipart upload ─────────────────────
// Body: multipart/form-data  { entry_id, file, kind? }

router.post('/upload', async (c) => {
  const userId = c.get('userId') as string

  const formData = await c.req.formData()
  const entryId  = formData.get('entry_id') as string | null
  const file     = formData.get('file') as File | null
  const kind     = (formData.get('kind') as string | null) ?? 'photo'

  if (!entryId || !file) {
    return c.json({ error: 'entry_id and file are required' }, 400)
  }

  if (file.size > MAX_MB * 1024 * 1024) {
    return c.json({ error: `File exceeds ${MAX_MB} MB limit` }, 413)
  }

  // Verify entry belongs to user
  const { data: entry, error: entryErr } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single()

  if (entryErr || !entry) return c.json({ error: 'Entry not found' }, 404)

  // Upload to Supabase Storage
  const ext      = file.name.split('.').pop() ?? 'bin'
  const filename = `${userId}/${entryId}/${Date.now()}.${ext}`
  const buffer   = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) return c.json({ error: uploadErr.message }, 500)

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename)

  // Insert media record
  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_entry_media')
    .insert({
      entry_id:   entryId,
      kind,
      url:        publicUrl,
      filename:   file.name,
      size_bytes: file.size,
    })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data, 201)
})

// ── GET /media/:entryId — all media for an entry ─────────────

router.get('/:entryId', async (c) => {
  const userId  = c.get('userId') as string
  const entryId = c.req.param('entryId')

  // Verify ownership
  const { data: entry } = await supabase
    .schema('d2flow')
    .from('pm_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single()

  if (!entry) return c.json({ error: 'Entry not found' }, 404)

  const { data, error } = await supabase
    .schema('d2flow')
    .from('pm_entry_media')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ media: data ?? [] })
})

// ── DELETE /media/item/:mediaId — remove a media file ────────

router.delete('/item/:mediaId', async (c) => {
  const userId  = c.get('userId') as string
  const mediaId = c.req.param('mediaId')

  // Fetch media record (join to verify ownership via entry)
  const { data: media } = await supabase
    .schema('d2flow')
    .from('pm_entry_media')
    .select('id, url, entry_id, pm_entries!inner(user_id)')
    .eq('id', mediaId)
    .single()

  if (!media) return c.json({ error: 'Media not found' }, 404)

  const entryAny = media as { pm_entries: { user_id: string }[] | { user_id: string } }
  const owner    = Array.isArray(entryAny.pm_entries)
    ? entryAny.pm_entries[0]?.user_id
    : (entryAny.pm_entries as { user_id: string }).user_id

  if (owner !== userId) return c.json({ error: 'Forbidden' }, 403)

  // Remove from storage
  const url      = media.url as string
  const bucket   = BUCKET
  // extract path after /object/public/BUCKET/
  const pathMatch = url.match(new RegExp(`/object/public/${bucket}/(.+)$`))
  if (pathMatch?.[1]) {
    await supabase.storage.from(bucket).remove([pathMatch[1]])
  }

  const { error } = await supabase
    .schema('d2flow')
    .from('pm_entry_media')
    .delete()
    .eq('id', mediaId)

  if (error) return c.json({ error: error.message }, 500)
  return c.json({ ok: true })
})

export default router
