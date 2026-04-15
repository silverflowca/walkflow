// ── List view — entries + walks history ──────────────────────

import { useState, useEffect, useRef } from 'react'
import { entries as entriesApi, walks as walksApi } from '../lib/api.js'
import type { Entry, Walk } from '../lib/types.js'
import { fmtDateTime, fmtDistance, fmtDuration } from '../lib/geo.js'
import { reverseGeocode } from '../lib/geocode.js'
import { useTheme } from '../context/ThemeContext.js'

interface Props {
  onAudioOpen?:  (entry: Entry) => void
  onFlyToEntry?: (entry: Entry) => void
}

function hasPfAudio(entry: Entry): boolean {
  if (!entry.ai_summary) return false
  try { return !!(JSON.parse(entry.ai_summary) as { pf_audio?: string }).pf_audio } catch { return false }
}

export function ListView({ onAudioOpen, onFlyToEntry }: Props) {
  const { theme } = useTheme()

  const TYPE_META: Record<string, { emoji: string; color: string }> = {
    prayer:       { emoji: '🙏', color: theme.prayer },
    praise:       { emoji: '🎉', color: theme.praise },
    intercession: { emoji: '⚔️', color: theme.intercession },
    burden:       { emoji: '💔', color: theme.burden },
    note:         { emoji: '📝', color: theme.note },
  }

  const [tab,       setTab]       = useState<'entries' | 'walks'>('entries')
  const [items,     setItems]     = useState<Entry[]>([])
  const [history,   setHistory]   = useState<Walk[]>([])
  const [loading,   setLoading]   = useState(false)
  // Map from entry id → street address
  const [addresses, setAddresses] = useState<Record<string, string>>({})
  const geocoding = useRef(new Set<string>())

  useEffect(() => {
    setLoading(true)
    if (tab === 'entries') {
      entriesApi.list({ limit: 100 })
        .then(r => setItems(r.entries))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      walksApi.list()
        .then(r => setHistory(r.walks))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [tab])

  // Reverse-geocode entries as they load (rate-limited: stagger 300ms each)
  useEffect(() => {
    if (tab !== 'entries') return
    items.forEach((e, idx) => {
      if (geocoding.current.has(e.id) || addresses[e.id]) return
      geocoding.current.add(e.id)
      setTimeout(() => {
        reverseGeocode(+e.lat, +e.lng)
          .then(addr => setAddresses(prev => ({ ...prev, [e.id]: addr })))
      }, idx * 300)
    })
  }, [items, tab])

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: theme.bg,
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', flexShrink: 0,
        padding: '0 16px',
        gap: 4,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        {(['entries', 'walks'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '14px 0',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, letterSpacing: 0.3,
              color: tab === t ? theme.accent : theme.textMuted,
              borderBottom: `2px solid ${tab === t ? theme.accent : 'transparent'}`,
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            {t === 'entries' ? 'Pins' : 'Walks'}
          </button>
        ))}
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 16px 100px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {loading && (
          <div style={{ color: theme.textMuted, textAlign: 'center', padding: 40, fontSize: 14 }}>
            Loading…
          </div>
        )}

        {/* Entry cards */}
        {tab === 'entries' && !loading && items.map(e => {
          const meta = TYPE_META[e.type] ?? { emoji: '📍', color: theme.note }
          const addr = addresses[e.id]
          return (
            <div
              key={e.id}
              style={{
                background: theme.bgCard,
                borderRadius: 16,
                border: `1px solid ${theme.border}`,
                padding: '14px 16px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${meta.color}18`,
                  border: `1.5px solid ${meta.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>{meta.emoji}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                      color: meta.color, textTransform: 'uppercase',
                    }}>{e.type}</span>

                    {hasPfAudio(e) && onAudioOpen && (
                      <button
                        onClick={() => onAudioOpen(e)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 10,
                          border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600,
                          background: `${theme.accent}25`, color: theme.accent,
                          fontFamily: 'inherit',
                        }}
                      >🎙 Audio</button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                    {fmtDateTime(e.created_at)}
                  </div>
                </div>
              </div>

              {/* Title */}
              {e.title && (
                <div style={{ fontSize: 15, fontWeight: 600, color: theme.textPrimary, lineHeight: 1.4 }}>
                  {e.title}
                </div>
              )}

              {/* Body */}
              {e.body && (
                <div style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 1.6 }}>
                  {e.body.slice(0, 140)}{e.body.length > 140 ? '…' : ''}
                </div>
              )}

              {/* Tags */}
              {e.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {e.tags.map(t => (
                    <span key={t} style={{
                      fontSize: 11, fontWeight: 600,
                      color: theme.textMuted,
                      background: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 8, padding: '2px 8px',
                    }}>#{t}</span>
                  ))}
                </div>
              )}

              {/* Address + fly-to button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: theme.textMuted, flex: 1 }}>
                  📍 {addr ?? `${(+e.lat).toFixed(5)}, ${(+e.lng).toFixed(5)}`}
                </span>
                {onFlyToEntry && (
                  <button
                    onClick={() => onFlyToEntry(e)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      background: theme.bgCard,
                      cursor: 'pointer',
                      fontSize: 11, fontWeight: 600,
                      color: theme.textSecondary,
                      fontFamily: 'inherit',
                      flexShrink: 0,
                    }}
                  >🗺 Show</button>
                )}
              </div>
            </div>
          )
        })}

        {/* Walk cards */}
        {tab === 'walks' && !loading && history.map(w => (
          <div
            key={w.id}
            style={{
              background: theme.bgCard,
              borderRadius: 16,
              border: `1px solid ${w.ended_at ? theme.border : `${theme.prayer}44`}`,
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: w.ended_at ? theme.bgCard : `${theme.prayer}18`,
                border: `1.5px solid ${w.ended_at ? theme.border : `${theme.prayer}55`}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🚶</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 600, color: theme.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{w.title ?? 'Untitled Walk'}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                  {fmtDateTime(w.started_at)}
                </div>
              </div>

              {!w.ended_at && (
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  color: theme.prayer, background: `${theme.prayer}18`,
                  borderRadius: 8, padding: '3px 8px', flexShrink: 0,
                }}>LIVE</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {w.ended_at && (
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  ⏱ {fmtDuration((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000)}
                </span>
              )}
              {w.distance_m != null && (
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  📏 {fmtDistance(w.distance_m)}
                </span>
              )}
              <span style={{ fontSize: 12, color: theme.textMuted }}>
                📍 {w.entry_count} pins
              </span>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && (tab === 'entries' ? items.length : history.length) === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '60px 20px', gap: 12,
          }}>
            <div style={{ fontSize: 40, opacity: 0.25 }}>{tab === 'entries' ? '📍' : '🚶'}</div>
            <div style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
              {tab === 'entries'
                ? 'No pins yet.\nStart a walk and drop a pin.'
                : 'No walks recorded yet.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
