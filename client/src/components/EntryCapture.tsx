// ── Entry capture — native-style bottom sheet ─────────────────

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

const TYPES: EntryType[] = ['prayer', 'praise', 'intercession', 'burden', 'note']

const TYPE_META: Record<EntryType, { emoji: string; label: string; color: string }> = {
  prayer:       { emoji: '🙏', label: 'Prayer',       color: '#81c784' },
  praise:       { emoji: '🎉', label: 'Praise',       color: '#ffd54f' },
  intercession: { emoji: '⚔️', label: 'Intercession', color: '#ff8a65' },
  burden:       { emoji: '💔', label: 'Burden',       color: '#ef5350' },
  note:         { emoji: '📝', label: 'Note',         color: '#7986cb' },
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

type AudioState = 'idle' | 'recording' | 'uploading' | 'done' | 'error'

export function EntryCapture({ position, onSaved, onClose }: Props) {
  const { activeWalk } = useWalkContext()
  const [type,   setType]   = useState<EntryType>('prayer')
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [tags,   setTags]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

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
      const aiSummary = audioFilename ? JSON.stringify({ pf_audio: audioFilename }) : undefined
      const entry = await entriesApi.create({
        lat: position.lat, lng: position.lng,
        accuracy_m: position.accuracy_m,
        walk_id: activeWalk?.id,
        type, title: title.trim() || undefined,
        body: body.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
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

  const meta = TYPE_META[type]
  const canSave = !!position && !saving && audioState !== 'recording' && audioState !== 'uploading'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          background: '#111320',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          maxHeight: '92vh', overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: `${meta.color}22`,
              border: `1.5px solid ${meta.color}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>{meta.emoji}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f2ff' }}>Drop a Pin</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {position
                  ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
                  : 'Acquiring GPS…'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: 8 }}>
            {TYPES.map(t => {
              const m = TYPE_META[t]
              const active = type === t
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    flex: 1, padding: '10px 4px',
                    borderRadius: 14, border: `1.5px solid ${active ? m.color : 'transparent'}`,
                    background: active ? `${m.color}22` : 'rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{m.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, color: active ? m.color : 'rgba(255,255,255,0.35)' }}>
                    {m.label.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Title input */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px',
          }}>
            <input
              placeholder="Title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', color: '#f0f2ff', fontSize: 15,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Body textarea */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px',
          }}>
            <textarea
              placeholder="Write your prayer or notes…"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={3}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                outline: 'none', color: '#f0f2ff', fontSize: 14,
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.6,
              }}
            />
          </div>

          {/* Tags */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>#</span>
            <input
              placeholder="Tags: healing, unity, city…"
              value={tags}
              onChange={e => setTags(e.target.value)}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', color: '#f0f2ff', fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Audio panel */}
          <div style={{
            background: 'rgba(63,81,181,0.08)', borderRadius: 16,
            border: '1px solid rgba(63,81,181,0.25)',
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🎙</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
                PRAYER AUDIO
              </span>
            </div>

            {audioState === 'idle' && (
              <button
                onClick={handleStartRec}
                style={{
                  padding: '10px 0', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #3949ab, #5c6bc0)',
                  color: '#fff', fontWeight: 600, fontSize: 14,
                  cursor: 'pointer', width: '100%',
                }}
              >
                🎙 Record Prayer Audio
              </button>
            )}

            {audioState === 'recording' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#ef5350', animation: 'pulse 1s infinite',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#ef5350', fontVariantNumeric: 'tabular-nums', flex: 1 }}>
                  {fmtMs(recorder.durationMs)}
                </span>
                <button
                  onClick={handleStopRec}
                  style={{
                    padding: '9px 20px', borderRadius: 12, border: 'none',
                    background: '#c62828', color: '#fff',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  ⏹ Stop
                </button>
              </div>
            )}

            {audioState === 'uploading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                Uploading &amp; transcribing…
              </div>
            )}

            {audioState === 'done' && audioBlob && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#81c784' }}>✓ Recorded</span>
                  <button
                    onClick={handleRetryAudio}
                    style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}
                  >Re-record</button>
                </div>
                <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: '100%', borderRadius: 10 }} />
                {transcript && (
                  <div style={{
                    background: 'rgba(0,0,0,0.3)', borderRadius: 10,
                    padding: '10px 12px', maxHeight: 100, overflowY: 'auto',
                    fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6,
                  }}>
                    {transcript.utterances.length > 0
                      ? transcript.utterances.map((u, i) => <p key={i} style={{ margin: '0 0 4px' }}>{u.transcript}</p>)
                      : transcript.transcript}
                  </div>
                )}
              </div>
            )}

            {audioState === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#ef5350', fontSize: 13, flex: 1 }}>⚠ {audioError}</span>
                <button
                  onClick={handleRetryAudio}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}
                >Retry</button>
              </div>
            )}

            {recorder.error && <div style={{ color: '#ef5350', fontSize: 12 }}>{recorder.error}</div>}
          </div>

          {error && (
            <div style={{
              background: 'rgba(198,40,40,0.15)', border: '1px solid rgba(198,40,40,0.4)',
              borderRadius: 10, padding: '10px 14px',
              color: '#ef9a9a', fontSize: 13,
            }}>{error}</div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '14px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}
            >Cancel</button>
            <button
              onClick={save}
              disabled={!canSave}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 14, border: 'none',
                background: canSave
                  ? 'linear-gradient(135deg, #3949ab, #5c6bc0)'
                  : 'rgba(255,255,255,0.08)',
                color: canSave ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 15, fontWeight: 700, cursor: canSave ? 'pointer' : 'default',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {saving ? '…' : <><span>📍</span> Save Pin</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
