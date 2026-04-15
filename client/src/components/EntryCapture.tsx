// ── Modal / bottom-sheet for creating a prayer entry ─────────

import { useState } from 'react'
import { entries as entriesApi, audio as audioApi } from '../lib/api.js'
import type { Entry, EntryType } from '../lib/types.js'
import type { PfTranscript } from '../lib/api.js'
import type { GpsPosition } from '../hooks/useGPS.js'
import { useWalkContext } from '../context/WalkContext.js'
import { useAudioRecorder } from '../hooks/useAudioRecorder.js'

interface Props {
  position: GpsPosition | null
  onSaved:  (e: Entry) => void
  onClose:  () => void
}

const TYPES: EntryType[] = ['note', 'prayer', 'intercession', 'praise', 'burden']

const TYPE_EMOJI: Record<EntryType, string> = {
  note:         '📝',
  prayer:       '🙏',
  intercession: '⚔️',
  praise:       '🎉',
  burden:       '💔',
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

type AudioState = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', background: '#1a1d2e',
    borderRadius: '16px 16px 0 0',
    padding: '20px 16px 32px',
    display: 'flex', flexDirection: 'column', gap: 14,
    maxHeight: '90vh', overflowY: 'auto',
  },
  title: { fontSize: 18, fontWeight: 700, color: '#e8eaf6' },
  label: { fontSize: 12, color: '#7986cb', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    width: '100%', background: '#2a2d3e', border: '1px solid #3d405b',
    borderRadius: 8, padding: '10px 12px', color: '#e8eaf6',
    fontSize: 15, outline: 'none',
  },
  textarea: {
    width: '100%', background: '#2a2d3e', border: '1px solid #3d405b',
    borderRadius: 8, padding: '10px 12px', color: '#e8eaf6',
    fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 90,
    fontFamily: 'inherit',
  },
  typeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  typePill: (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500,
    background: active ? '#3f51b5' : '#2a2d3e',
    color: active ? '#fff' : '#9fa8da',
  }),
  row: { display: 'flex', gap: 10 },
  saveBtn: {
    flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
    background: '#3f51b5', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
  },
  cancelBtn: {
    padding: '12px 20px', borderRadius: 10, border: 'none',
    background: '#2a2d3e', color: '#9fa8da', fontSize: 15, cursor: 'pointer',
  },
  gps: { fontSize: 12, color: '#555', textAlign: 'center' as const },
  // Audio panel
  audioPanel: {
    background: '#12142a', border: '1px solid #2d3056',
    borderRadius: 10, padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  audioHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  recBtn: (recording: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 13,
    background: recording ? '#c62828' : '#3f51b5',
    color: '#fff',
  }),
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#ef5350', animation: 'pulse 1s infinite',
  },
  timer: { fontSize: 13, color: '#ef5350', fontVariantNumeric: 'tabular-nums' },
  transcriptBox: {
    background: '#1e2038', borderRadius: 8, padding: '10px 12px',
    maxHeight: 120, overflowY: 'auto',
    fontSize: 13, color: '#b0bec5', lineHeight: 1.6,
  },
  audioPreview: {
    width: '100%', borderRadius: 8, background: '#2a2d3e',
    outline: 'none', display: 'block',
  },
}

export function EntryCapture({ position, onSaved, onClose }: Props) {
  const { activeWalk } = useWalkContext()
  const [type,   setType]   = useState<EntryType>('prayer')
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [tags,   setTags]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  // Audio state
  const recorder = useAudioRecorder()
  const [audioState,    setAudioState]    = useState<AudioState>('idle')
  const [audioFilename, setAudioFilename] = useState<string | null>(null)
  const [audioBlob,     setAudioBlob]     = useState<Blob | null>(null)
  const [transcript,    setTranscript]    = useState<PfTranscript | null>(null)
  const [audioError,    setAudioError]    = useState<string | null>(null)

  const handleStartRec = async () => {
    setAudioError(null)
    await recorder.start()
    setAudioState('recording')
  }

  const handleStopRec = async () => {
    setAudioState('uploading')
    try {
      const blob = await recorder.stop()
      setAudioBlob(blob)
      const recName = (title.trim() || 'prayer-walk').replace(/\s+/g, '-').toLowerCase()
      const { filename } = await audioApi.upload(blob, recName)
      setAudioFilename(filename)
      const tx = await audioApi.transcribe(filename)
      setTranscript(tx)
      setAudioState('done')
    } catch (e) {
      setAudioError(e instanceof Error ? e.message : 'Audio upload failed')
      setAudioState('error')
    }
  }

  const handleRetryAudio = () => {
    recorder.reset()
    setAudioState('idle')
    setAudioFilename(null)
    setAudioBlob(null)
    setTranscript(null)
    setAudioError(null)
  }

  const save = async () => {
    if (!position) { setError('Waiting for GPS…'); return }
    setSaving(true); setError(null)
    try {
      const aiSummary = audioFilename
        ? JSON.stringify({ pf_audio: audioFilename })
        : undefined
      const entry = await entriesApi.create({
        lat:        position.lat,
        lng:        position.lng,
        accuracy_m: position.accuracy_m,
        walk_id:    activeWalk?.id,
        type,
        title:      title.trim() || undefined,
        body:       body.trim()  || undefined,
        tags:       tags.split(',').map(t => t.trim()).filter(Boolean),
        ai_summary: aiSummary,
      })
      onSaved(entry)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.title}>New Pin</div>

        <div>
          <span style={S.label}>Type</span>
          <div style={S.typeRow}>
            {TYPES.map(t => (
              <button key={t} style={S.typePill(type === t)} onClick={() => setType(t)}>
                {TYPE_EMOJI[t]} {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span style={S.label}>Title</span>
          <input
            style={S.input}
            placeholder="Short title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div>
          <span style={S.label}>Notes / Prayer</span>
          <textarea
            style={S.textarea}
            placeholder="Write your prayer or note here…"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>

        <div>
          <span style={S.label}>Tags (comma-separated)</span>
          <input
            style={S.input}
            placeholder="healing, unity, city…"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
        </div>

        {/* ── Audio Recording Panel ─────────────────────── */}
        <div style={S.audioPanel}>
          <span style={S.label}>🎙 Prayer Audio</span>

          {audioState === 'idle' && (
            <button style={S.recBtn(false)} onClick={handleStartRec}>
              🎙 Record Prayer Audio
            </button>
          )}

          {audioState === 'recording' && (
            <div style={S.audioHeader}>
              <div style={S.dot} />
              <span style={S.timer}>{fmtMs(recorder.durationMs)}</span>
              <button style={S.recBtn(true)} onClick={handleStopRec}>
                ⏹ Stop
              </button>
            </div>
          )}

          {audioState === 'uploading' && (
            <div style={{ color: '#9fa8da', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
              Uploading &amp; transcribing…
            </div>
          )}

          {audioState === 'done' && audioBlob && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#81c784', fontSize: 13, fontWeight: 600 }}>✓ Recorded</span>
                <button
                  style={{ ...S.recBtn(false), background: '#2a2d3e', color: '#9fa8da', padding: '4px 10px', fontSize: 12 }}
                  onClick={handleRetryAudio}
                >
                  Re-record
                </button>
              </div>
              <audio
                style={S.audioPreview}
                controls
                src={URL.createObjectURL(audioBlob)}
              />
              {transcript && (
                <div style={S.transcriptBox}>
                  {transcript.utterances.length > 0
                    ? transcript.utterances.map((u, i) => (
                        <p key={i} style={{ margin: '0 0 4px' }}>{u.transcript}</p>
                      ))
                    : transcript.transcript}
                </div>
              )}
            </div>
          )}

          {audioState === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#ef5350', fontSize: 13 }}>
                ⚠ {audioError}
              </span>
              <button style={{ ...S.recBtn(false), background: '#2a2d3e', padding: '4px 10px', fontSize: 12 }} onClick={handleRetryAudio}>
                Retry
              </button>
            </div>
          )}

          {recorder.error && (
            <div style={{ color: '#ef5350', fontSize: 12 }}>{recorder.error}</div>
          )}
        </div>

        {position ? (
          <div style={S.gps}>
            📍 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            {' '}± {Math.round(position.accuracy_m)} m
          </div>
        ) : (
          <div style={{ ...S.gps, color: '#c62828' }}>Acquiring GPS…</div>
        )}

        {error && <div style={{ color: '#ef5350', fontSize: 13 }}>{error}</div>}

        <div style={S.row}>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={S.saveBtn} disabled={saving || !position || audioState === 'recording' || audioState === 'uploading'} onClick={save}>
            {saving ? 'Saving…' : 'Save Pin'}
          </button>
        </div>
      </div>
    </div>
  )
}
