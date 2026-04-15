// ── Inline prayer audio player + word-synced transcript ───────
// Opens as a full-screen modal overlay (native-style bottom sheet).

import { useState, useEffect, useRef, useCallback } from 'react'
import { audio as audioApi } from '../lib/api.js'
import type { PfTranscript, PfUtterance, PfWord } from '../lib/api.js'
import type { Entry } from '../lib/types.js'

interface Props {
  entry:   Entry
  onClose: () => void
}

function getPfAudio(entry: Entry): string | null {
  if (!entry.ai_summary) return null
  try {
    const parsed = JSON.parse(entry.ai_summary) as { pf_audio?: string }
    return parsed.pf_audio ?? null
  } catch {
    return null
  }
}

const TYPE_META: Record<string, { emoji: string; color: string }> = {
  prayer:       { emoji: '🙏', color: '#81c784' },
  praise:       { emoji: '🎉', color: '#ffd54f' },
  intercession: { emoji: '⚔️', color: '#ff8a65' },
  burden:       { emoji: '💔', color: '#ef5350' },
  note:         { emoji: '📝', color: '#7986cb' },
}

export function PrayerAudioPlayer({ entry, onClose }: Props) {
  const filename = getPfAudio(entry)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const meta = TYPE_META[entry.type] ?? { emoji: '📍', color: '#7986cb' }

  const [transcript,   setTranscript]   = useState<PfTranscript | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState<string | null>(null)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [isPlaying,    setIsPlaying]    = useState(false)

  useEffect(() => {
    if (!filename) { setLoading(false); return }
    audioApi.getTranscript(filename)
      .then(tx => { setTranscript(tx); setLoading(false) })
      .catch(e  => { setLoadError(e instanceof Error ? e.message : 'Failed to load transcript'); setLoading(false) })
  }, [filename])

  const handleTimeUpdate = useCallback(() => {
    setCurrentTime(audioRef.current?.currentTime ?? 0)
  }, [])

  const seekToWord = useCallback((word: PfWord) => {
    if (audioRef.current) {
      audioRef.current.currentTime = word.start
      audioRef.current.play()
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          background: '#0e1022',
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 20px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `${meta.color}18`,
            border: `1.5px solid ${meta.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
          }}>{meta.emoji}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: '#f0f2ff',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.title ?? entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              📍 {(+entry.lat).toFixed(5)}, {(+entry.lng).toFixed(5)}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap',
            padding: '10px 20px 0',
            flexShrink: 0,
          }}>
            {entry.tags.map(t => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 8, padding: '2px 8px',
              }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Audio player */}
        {filename && (
          <div style={{ padding: '14px 20px 0', flexShrink: 0 }}>
            <audio
              ref={audioRef}
              controls
              src={audioApi.playUrl(filename)}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{
                width: '100%', borderRadius: 12,
                outline: 'none', display: 'block',
                // Tint the native audio bar
                accentColor: meta.color,
              }}
            />
          </div>
        )}

        {/* Transcript area — scrollable */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 20px 8px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.8 }}>
              TRANSCRIPT
            </span>
            {loading && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', animation: 'pulse 1.2s ease-in-out infinite' }}>
                Loading…
              </span>
            )}
          </div>

          {loadError && (
            <div style={{
              background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.3)',
              borderRadius: 12, padding: '12px 14px',
              fontSize: 13, color: '#ef9a9a',
            }}>⚠ {loadError}</div>
          )}

          {!loading && !loadError && !filename && (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>
              No audio attached to this pin.
            </div>
          )}

          {!loading && !loadError && transcript && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              {transcript.utterances.length > 0
                ? transcript.utterances.map((utt: PfUtterance, ui: number) => (
                    <div
                      key={ui}
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 4px', lineHeight: 1.8 }}
                    >
                      {utt.words.map((w: PfWord, wi: number) => {
                        const active = currentTime >= w.start && currentTime < w.end
                        const past   = currentTime >= w.end
                        return (
                          <span
                            key={wi}
                            onClick={() => seekToWord(w)}
                            style={{
                              display: 'inline',
                              padding: '1px 4px',
                              borderRadius: 5,
                              fontSize: 15,
                              cursor: 'pointer',
                              fontWeight: active ? 700 : 400,
                              background: active ? meta.color : 'transparent',
                              color: active ? '#fff'
                                : past ? 'rgba(255,255,255,0.55)'
                                : 'rgba(255,255,255,0.3)',
                              transition: 'background 0.12s, color 0.12s',
                              letterSpacing: 0.1,
                            }}
                          >
                            {w.punctuated_word}
                          </span>
                        )
                      })}
                    </div>
                  ))
                : (
                  <p style={{
                    color: 'rgba(255,255,255,0.45)', fontSize: 15,
                    margin: 0, lineHeight: 1.8,
                  }}>
                    {transcript.transcript}
                  </p>
                )
              }
            </div>
          )}

          {!loading && !loadError && transcript === null && filename && (
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px 0' }}>
              No transcript available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
