// ============================================================
// PrayerMap Server — port 3014
// ============================================================

import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono }  from 'hono'
import { cors }  from 'hono/cors'
import { logger } from 'hono/logger'
import { WebSocketServer } from 'ws'

import { requireAuth as authMiddleware } from './middleware/auth.js'
import { initWss }        from './lib/wss.js'

import walksRouter   from './routes/walks.js'
import pathRouter    from './routes/path.js'
import entriesRouter from './routes/entries.js'
import mediaRouter   from './routes/media.js'

const app = new Hono()

// ── Global middleware ────────────────────────────────────────

app.use('*', cors({
  origin: process.env.ALLOWED_ORIGIN ?? '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))

app.use('*', logger())

// ── Health ───────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, service: 'prayermap-server', ts: Date.now() }))

// ── Auth-protected routes ────────────────────────────────────

app.use('/api/*', authMiddleware)

// Walks CRUD
app.route('/api/prayer-map/walks', walksRouter)

// Path-points (nested under walks)
app.route('/api/prayer-map/walks', pathRouter)

// Entries
app.route('/api/prayer-map/entries', entriesRouter)

// Media upload/fetch/delete
app.route('/api/prayer-map/media', mediaRouter)

// ── Start ────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3014')

const httpServer = serve({ fetch: app.fetch, port: PORT }, () => {
  console.log('[prayermap-server] listening on http://localhost:' + PORT)
  if (process.env.NO_AUTH === 'true') console.log('[prayermap-server] Mode: NO_AUTH (dev)')
})

const wss = new WebSocketServer({ server: httpServer as Parameters<typeof WebSocketServer.prototype.constructor>[0]['server'] })
initWss(wss)
