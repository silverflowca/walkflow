// ── PrayerFlow server-side client ─────────────────────────────
// Shared service account — credentials in env vars or set at runtime.
// Lazily obtains + caches a JWT token; re-logins on 401.

let _base  = (process.env.PRAYERFLOW_URL   ?? 'http://localhost:3025').replace(/\/$/, '')
let _user  = process.env.PRAYERFLOW_USER   ?? ''
let _pass  = process.env.PRAYERFLOW_PASS   ?? ''
let _token: string | null = process.env.PRAYERFLOW_TOKEN ?? null

// ── Runtime config ────────────────────────────────────────────

export function setPfConfig(opts: { url?: string; user?: string; pass?: string; token?: string }) {
  if (opts.url)   { _base = opts.url.replace(/\/$/, ''); _token = null }
  if (opts.user)  { _user = opts.user; _token = null }
  if (opts.pass)  { _pass = opts.pass; _token = null }
  if (opts.token) { _token = opts.token }
}

export function getPfConfig() {
  return {
    url:        _base,
    user:       _user,
    configured: !!(_token || (_user && _pass)),
  }
}

// ── Auth ──────────────────────────────────────────────────────

async function login(): Promise<string> {
  if (!_user || !_pass) throw new Error('PrayerFlow credentials not configured (set PRAYERFLOW_USER + PRAYERFLOW_PASS or use POST /api/prayer-map/audio/config)')
  const res = await fetch(`${_base}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username: _user, password: _pass }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PrayerFlow login failed ${res.status}: ${body}`)
  }
  const data = await res.json() as { token: string }
  _token = data.token
  return _token
}

async function getToken(): Promise<string> {
  if (!_token) return login()
  return _token
}

async function pfFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getToken()
  const res = await fetch(`${_base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 401 && retry) {
    _token = null
    return pfFetch(path, init, false)
  }
  return res
}

// ── Upload audio buffer to PrayerFlow ────────────────────────

export interface PfUploadResult {
  filename: string
  size: number
}

export async function pfUpload(
  buffer: Buffer,
  name: string,
  mimeType = 'audio/webm',
): Promise<PfUploadResult> {
  const ext  = mimeType.includes('mp4') ? '.mp4' : '.webm'
  const blob = new Blob([buffer as unknown as BlobPart], { type: mimeType })
  const form = new FormData()
  form.append('audio', blob, `${name}${ext}`)
  form.append('name', name)

  const res = await pfFetch('/api/recordings', { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PrayerFlow upload failed ${res.status}: ${err}`)
  }
  return res.json() as Promise<PfUploadResult>
}

// ── Transcript types ──────────────────────────────────────────

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

// ── Trigger Deepgram transcription ───────────────────────────

export async function pfTranscribe(filename: string): Promise<PfTranscript> {
  const res = await pfFetch(`/api/transcripts/${encodeURIComponent(filename)}`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PrayerFlow transcribe failed ${res.status}: ${err}`)
  }
  return res.json() as Promise<PfTranscript>
}

export async function pfGetTranscript(filename: string): Promise<PfTranscript> {
  const res = await pfFetch(`/api/transcripts/${encodeURIComponent(filename)}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PrayerFlow get transcript failed ${res.status}: ${err}`)
  }
  return res.json() as Promise<PfTranscript>
}

// ── Stream audio bytes ────────────────────────────────────────

export async function pfGetAudioStream(filename: string): Promise<Response> {
  return pfFetch(`/api/recordings/${encodeURIComponent(filename)}`)
}
