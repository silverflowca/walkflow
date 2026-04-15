// ── PrayerFlow audio proxy ────────────────────────────────────
// Routes:
//   GET    /config               — get PrayerFlow connection status
//   POST   /config               — update PrayerFlow URL/user/pass at runtime
//   POST   /upload               — receive audio from client, store in PrayerFlow
//   POST   /transcribe/:filename — trigger Deepgram transcription in PrayerFlow
//   GET    /transcript/:filename — fetch transcript JSON from PrayerFlow
//   GET    /play/:filename       — proxy audio stream from PrayerFlow

import { Hono } from 'hono'
import {
  pfUpload, pfTranscribe, pfGetTranscript, pfGetAudioStream,
  setPfConfig, getPfConfig,
} from '../lib/prayerflow.js'

const router = new Hono()

// ── GET /config ───────────────────────────────────────────────
// Returns current PrayerFlow connection config (never exposes password)

router.get('/config', (c) => {
  const { url, user, configured } = getPfConfig()
  return c.json({ url, user, configured })
})

// ── POST /config ──────────────────────────────────────────────
// Update PrayerFlow credentials at runtime (persisted in memory for session)

router.post('/config', async (c) => {
  const body = await c.req.json<{ url?: string; user?: string; pass?: string }>()
  setPfConfig(body)
  return c.json({ ok: true, ...getPfConfig() })
})

// ── POST /upload ──────────────────────────────────────────────

router.post('/upload', async (c) => {
  try {
    const form     = await c.req.formData()
    const file     = form.get('audio') as File | null
    const name     = (form.get('name') as string | null) ?? 'prayer-walk'

    if (!file) return c.json({ error: 'No audio file' }, 400)

    const buffer   = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'audio/webm'
    const result   = await pfUpload(buffer, name, mimeType)
    return c.json(result)
  } catch (e) {
    console.error('[audio/upload]', e)
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

// ── POST /transcribe/:filename ────────────────────────────────

router.post('/transcribe/:filename', async (c) => {
  const filename = decodeURIComponent(c.req.param('filename'))
  try {
    const transcript = await pfTranscribe(filename)
    return c.json(transcript)
  } catch (e) {
    console.error('[audio/transcribe]', e)
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

// ── GET /transcript/:filename ─────────────────────────────────

router.get('/transcript/:filename', async (c) => {
  const filename = decodeURIComponent(c.req.param('filename'))
  try {
    const transcript = await pfGetTranscript(filename)
    return c.json(transcript)
  } catch (e) {
    console.error('[audio/transcript]', e)
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

// ── GET /play/:filename ───────────────────────────────────────

router.get('/play/:filename', async (c) => {
  const filename = decodeURIComponent(c.req.param('filename'))
  try {
    const upstream = await pfGetAudioStream(filename)
    if (!upstream.ok) return c.json({ error: 'Audio not found' }, 404)

    const contentType = upstream.headers.get('Content-Type') ?? 'audio/webm'
    const buf = await upstream.arrayBuffer()
    return new Response(buf, {
      headers: {
        'Content-Type':   contentType,
        'Content-Length': String(buf.byteLength),
        'Accept-Ranges':  'bytes',
        'Cache-Control':  'no-store',
      },
    })
  } catch (e) {
    console.error('[audio/play]', e)
    return c.json({ error: e instanceof Error ? e.message : String(e) }, 502)
  }
})

export default router
