// ── Inline prayer audio player + word-synced transcript ───────
// Opens as a full-screen modal overlay.
// Reads pf_audio filename from entry.ai_summary JSON.
// Fetches transcript from walkflow server proxy, streams audio the same way.

import { useState, useEffect, useRef, useCallback } from 'react'
import { audio as audioApi } from '../lib/api.js'
import type { PfTranscript, PfUtterance, PfWord } from '../lib/api.js'
import type { Entry } from '../lib/types.js'

interface Props {
  entry:   Entry
  onClose: () => void
}

// Parse ai_summary JSON to get pf_audio filename
function getPfAudio(entry: Entry): string | null {
  if (!entry.ai_summary) return null
  try {
    const parsed = JSON.parse(entry.ai_summary) as { pf_audio?: string }
    return parsed.pf_audio ?? null
  } catch {
    return null
  }
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'stretch',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px 8px',
    borderBottom: '1px solid #2d3056',
    flexShrink: 0,
  },
  title: { fontSize: 16, fontWeight: 700, color: '#e8eaf6', flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  closeBtn: {
    background: 'none', border: 'none', color: '#9fa8da',
    fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  },
  body: {
    flex: 1, overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  audioEl: { width: '100%', borderRadius: 8, display: 'block', outline: 'none' },
  transcriptArea: {
    flex: 1, overflowY: 'auto',
    background: '#12142a', borderRadius: 10,
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  utterance: {
    display: 'flex', flexWrap: 'wrap', gap: 4,
    lineHeight: 1.8,
  },
  word: (active: boolean, past: boolean): React.CSSProperties => ({
    display: 'inline',
    padding: '1px 3px',
    borderRadius: 4,
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    background: active ? '#3f51b5' : 'transparent',
    color: active ? '#fff' : past ? '#9fa8da' : '#616a9a',
    transition: 'background 0.15s, color 0.15s',
    textDecoration: 'none',
  }),
  loading: { color: '#555', textAlign: 'center', padding: 40, fontSize: 14 },
  errorBox: { color: '#ef5350', fontSize: 13, textAlign: 'center', padding: 20 },
  metaRow: { fontSize: 12, color: '#555', display: 'flex', gap: 12 },
  tag: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 12,
    fontSize: 11, fontWeight: 600, background: '#2a2d3e', color: '#7986cb',
  },
}

export function PrayerAudioPlayer({ entry, onClose }: Props) {
  const filename = getPfAudio(entry)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [transcript, setTranscript] = useState<PfTranscript | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [loadError,  setLoadError]  = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  // Load transcript on mount
  useEffect(() => {
    if (!filename) { setLoading(false); return }
    audioApi.getTranscript(filename)
      .then(tx => { setTranscript(tx); setLoading(false) })
      .catch(e  => { setLoadError(e instanceof Error ? e.message : 'Failed to load transcript'); setLoading(false) })
  }, [filename])

  // Track audio currentTime
  const handleTimeUpdate = useCallback(() => {
    setCurrentTime(audioRef.current?.currentTime ?? 0)
  }, [])

  // Click word → seek
  const seekToWord = useCallback((word: PfWord) => {
    if (audioRef.current) {
      audioRef.current.currentTime = word.start
      audioRef.current.play()
    }
  }, [])

  if (!filename) {
    return (
      <div style={S.overlay} onClick={onClose}>
        <div style={{ ...S.body, justifyContent: 'center', alignItems: 'center' }}>
          <div style={S.errorBox}>No audio attached to this pin.</div>
        </div>
      </div>
    )
  }

  const audioUrl = audioApi.playUrl(filename)

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.header}>
          <div style={S.title}>🎙 {entry.title ?? entry.type}</div>
          <button style={S.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div style={S.body}>
          {/* Meta */}
          <div style={S.metaRow}>
            <span>📍 {(+entry.lat).toFixed(5)}, {(+entry.lng).toFixed(5)}</span>
            {entry.tags.length > 0 && (
              <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {entry.tags.map(t => <span key={t} style={S.tag}>#{t}</span>)}
              </span>
            )}
          </div>

          {/* Audio element */}
          <audio
            ref={audioRef}
            style={S.audioEl}
            controls
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Transcript */}
          {loading && <div style={S.loading}>Loading transcript…</div>}
          {loadError && <div style={S.errorBox}>⚠ {loadError}</div>}
          {!loading && !loadError && transcript && (
            <div style={S.transcriptArea}>
              {transcript.utterances.length > 0
                ? transcript.utterances.map((utt: PfUtterance, ui: number) => (
                    <div key={ui} style={S.utterance}>
                      {utt.words.map((w: PfWord, wi: number) => {
                        const active = currentTime >= w.start && currentTime < w.end
                        const past   = currentTime >= w.end
                        return (
                          <span
                            key={wi}
                            style={S.word(active, past)}
                            onClick={() => seekToWord(w)}
                          >
                            {w.punctuated_word}
                          </span>
                        )
                      })}
                    </div>
                  ))
                : (
                  <p style={{ color: '#9fa8da', fontSize: 15, margin: 0, lineHeight: 1.7 }}>
                    {transcript.transcript}
                  </p>
                )
              }
            </div>
          )}
          {!loading && !loadError && !transcript && (
            <div style={S.errorBox}>No transcript available for this recording.</div>
          )}
        </div>
      </div>
    </div>
  )
}
