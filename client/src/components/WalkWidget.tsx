// ── Walk widget — floating card above bottom tab bar ──────────

import { useState } from 'react'
import { useWalkContext } from '../context/WalkContext.js'
import { useTheme } from '../context/ThemeContext.js'
import type { PathPoint } from '../lib/types.js'
import { fmtDistance, fmtDuration } from '../lib/geo.js'

interface Props {
  points:  PathPoint[]
  seconds: number
  onPin:   () => void
}

export function WalkWidget({ points, seconds, onPin }: Props) {
  const { activeWalk, startWalk, endWalk } = useWalkContext()
  const { theme } = useTheme()
  const [starting, setStarting] = useState(false)
  const [ending,   setEnding]   = useState(false)
  const [title,    setTitle]    = useState('')

  // Distance calc
  let distM = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i]
    const dLat = (+b.lat - +a.lat) * Math.PI / 180
    const dLng = (+b.lng - +a.lng) * Math.PI / 180
    const φ1   = +a.lat * Math.PI / 180, φ2 = +b.lat * Math.PI / 180
    const x    = Math.sin(dLat / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dLng / 2) ** 2
    distM += 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  }

  const cardBase: React.CSSProperties = {
    position: 'fixed',
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
    left: 16, right: 16,
    zIndex: 800,
    borderRadius: 18,
    background: theme.bgSheet,
    border: `1px solid ${theme.border}`,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(20px)',
  }

  // ── Idle state: start a new walk ──────────────────────────
  if (!activeWalk) {
    return (
      <div style={{ ...cardBase, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: theme.textMuted, flexShrink: 0,
        }} />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !starting) {
              setStarting(true)
              startWalk(title.trim() || undefined).catch(() => {}).finally(() => { setStarting(false); setTitle('') })
            }
          }}
          placeholder="Name this walk…"
          style={{
            flex: 1, background: 'transparent',
            border: 'none', outline: 'none',
            color: theme.textPrimary, fontSize: 15,
            fontFamily: 'inherit',
          }}
        />
        <button
          disabled={starting}
          onClick={async () => {
            setStarting(true)
            await startWalk(title.trim() || undefined).catch(() => {})
            setStarting(false)
            setTitle('')
          }}
          style={{
            padding: '9px 20px',
            borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${theme.prayer}cc, ${theme.prayer})`,
            color: '#fff', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', flexShrink: 0,
            opacity: starting ? 0.6 : 1,
          }}
        >
          {starting ? '…' : '▶ Start'}
        </button>
      </div>
    )
  }

  // ── Active walk: stats + pin + end ────────────────────────
  return (
    <div style={{ ...cardBase, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Live indicator row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: theme.prayer,
          boxShadow: `0 0 0 3px ${theme.prayer}40`,
          animation: 'pulse 2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.prayer, letterSpacing: 0.5 }}>
          WALK IN PROGRESS
        </span>
        {activeWalk.title && (
          <span style={{
            fontSize: 12, color: theme.textMuted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>· {activeWalk.title}</span>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 0 }}>
        {[
          { value: fmtDuration(seconds), label: 'Time' },
          { value: fmtDistance(distM),   label: 'Distance' },
          { value: String(points.length), label: 'GPS pts' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            borderRight: i < 2 ? `1px solid ${theme.border}` : 'none',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.5 }}>
              {s.value}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, letterSpacing: 0.8 }}>
              {s.label.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onPin}
          style={{
            flex: 1, padding: '11px 0',
            borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${theme.accent}cc, ${theme.accent})`,
            color: '#fff', fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 16 }}>📍</span> Drop Pin
        </button>
        <button
          disabled={ending}
          onClick={async () => {
            setEnding(true)
            await endWalk().catch(() => {})
            setEnding(false)
          }}
          style={{
            padding: '11px 20px',
            borderRadius: 12, border: `1px solid ${theme.burden}66`,
            background: `${theme.burden}15`,
            color: theme.burden, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', flexShrink: 0,
            opacity: ending ? 0.6 : 1,
          }}
        >
          {ending ? '…' : '⏹ End'}
        </button>
      </div>
    </div>
  )
}
