// ── API client ────────────────────────────────────────────────

import type { Walk, PathPoint, PathStats, Entry, EntryType, Media } from './types.js'

// ── PrayerFlow transcript types (mirrored from server) ────────

export interface PfWord {
  word: string
  punctuated_word: string
  start: number
  end: number
  confidence: number
}

export interface PfUtterance {
  start: number
  end: number
  transcript: string
  words: PfWord[]
}

export interface PfTranscript {
  filename: string
  transcript: string
  duration: number
  words: PfWord[]
  utterances: PfUtterance[]
  createdAt: string
}

export interface PfUploadResult {
  filename: string
  size: number
}

export interface PfConfig {
  url: string
  user: string
  configured: boolean
}

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/prayer-map`
  : '/api/prayer-map'

function headers(): HeadersInit {
  const token = localStorage.getItem('pm_token')
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

// ── Walks ─────────────────────────────────────────────────────

export const walks = {
  list: ()                                     => req<{ walks: Walk[] }>('GET', '/walks'),
  create: (title?: string)                     => req<Walk>('POST', '/walks', { title }),
  end: (id: string)                            => req<Walk>('PATCH', `/walks/${id}`, { ended_at: new Date().toISOString() }),
  updateTitle: (id: string, title: string)     => req<Walk>('PATCH', `/walks/${id}`, { title }),
  remove: (id: string)                         => req<{ ok: boolean }>('DELETE', `/walks/${id}`),
}

// ── Path points ───────────────────────────────────────────────

export const path = {
  add: (walkId: string, payload: { lat: number; lng: number; seq: number; accuracy_m?: number; altitude_m?: number }) =>
    req<PathPoint>('POST', `/walks/${walkId}/path-points`, payload),

  list: (walkId: string) =>
    req<{ points: PathPoint[] }>('GET', `/walks/${walkId}/path-points`),

  stats: (walkId: string) =>
    req<PathStats>('GET', `/walks/${walkId}/path-stats`),
}

// ── Entries ───────────────────────────────────────────────────

export const entries = {
  create: (payload: {
    lat: number; lng: number; walk_id?: string; accuracy_m?: number
    type?: EntryType; title?: string; body?: string; tags?: string[]
    ai_summary?: string
  }) => req<Entry>('POST', '/entries', payload),

  list: (opts?: { walk_id?: string; type?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams()
    if (opts?.walk_id) params.set('walk_id', opts.walk_id)
    if (opts?.type)    params.set('type', opts.type)
    if (opts?.limit)   params.set('limit', String(opts.limit))
    if (opts?.offset)  params.set('offset', String(opts.offset))
    const qs = params.toString()
    return req<{ entries: Entry[]; offset: number; limit: number }>('GET', `/entries${qs ? `?${qs}` : ''}`)
  },

  get: (id: string)    => req<Entry>('GET', `/entries/${id}`),

  update: (id: string, payload: Partial<Pick<Entry, 'title' | 'body' | 'type' | 'tags' | 'ai_summary'>>) =>
    req<Entry>('PATCH', `/entries/${id}`, payload),

  remove: (id: string) => req<{ ok: boolean }>('DELETE', `/entries/${id}`),

  nearby: (lat: number, lng: number, radius_m = 500) =>
    req<{ entries: Entry[] }>('GET', `/entries/nearby?lat=${lat}&lng=${lng}&radius_m=${radius_m}`),
}

// ── Media ─────────────────────────────────────────────────────

export const media = {
  upload: async (entryId: string, file: File, kind: 'photo' | 'audio' = 'photo'): Promise<Media> => {
    const form = new FormData()
    form.append('entry_id', entryId)
    form.append('file', file)
    form.append('kind', kind)
    const token = localStorage.getItem('pm_token')
    const res = await fetch(`${BASE}/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? res.statusText)
    }
    return res.json()
  },

  list: (entryId: string) =>
    req<{ media: Media[] }>('GET', `/media/${entryId}`),

  remove: (mediaId: string) =>
    req<{ ok: boolean }>('DELETE', `/media/item/${mediaId}`),
}

// ── Audio (PrayerFlow proxy) ───────────────────────────────────

export const audio = {
  getConfig: () => req<PfConfig>('GET', '/audio/config'),

  setConfig: (cfg: { url?: string; user?: string; pass?: string; token?: string }) =>
    req<PfConfig & { ok: boolean }>('POST', '/audio/config', cfg),

  upload: async (blob: Blob, name: string): Promise<PfUploadResult> => {
    const form = new FormData()
    const ext  = blob.type.includes('mp4') ? '.mp4' : '.webm'
    form.append('audio', blob, `${name}${ext}`)
    form.append('name', name)
    const token = localStorage.getItem('pm_token')
    const res = await fetch(`${BASE}/audio/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? res.statusText)
    }
    return res.json()
  },

  transcribe:    (filename: string) => req<PfTranscript>('POST', `/audio/transcribe/${encodeURIComponent(filename)}`),
  getTranscript: (filename: string) => req<PfTranscript>('GET',  `/audio/transcript/${encodeURIComponent(filename)}`),
  playUrl:       (filename: string) => `${BASE}/audio/play/${encodeURIComponent(filename)}`,
}
