// ── Walk status widget (always-visible bottom bar) ────────────

import { useState } from 'react'
import { useWalkContext } from '../context/WalkContext.js'
import type { PathPoint } from '../lib/types.js'
import { fmtDistance, fmtDuration } from '../lib/geo.js'

interface Props {
  points:   PathPoint[]
  seconds:  number
  onPin:    () => void      // open EntryCapture
}

const S: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
    background: '#1a1d2e', borderTop: '1px solid #2d3056',
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
    minHeight: 64,
  },
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#4caf50', flexShrink: 0,
    boxShadow: '0 0 6px #4caf50',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  dotIdle: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#555', flexShrink: 0,
  },
  stats: { flex: 1, display: 'flex', gap: 16 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  label: { fontSize: 10, color: '#7986cb', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 15, fontWeight: 600, color: '#e8eaf6' },
  btn: {
    padding: '8px 14px', borderRadius: 8, border: 'none',
    fontWeight: 600, fontSize: 13, cursor: 'pointer', flexShrink: 0,
  },
  pinBtn: { background: '#3f51b5', color: '#fff' },
  endBtn: { background: '#c62828', color: '#fff' },
  startBtn: { background: '#2e7d32', color: '#fff', flex: 1, padding: '10px 0' },
}

export function WalkWidget({ points, seconds, onPin }: Props) {
  const { activeWalk, startWalk, endWalk } = useWalkContext()
  const [starting, setStarting] = useState(false)
  const [ending,   setEnding]   = useState(false)
  const [title,    setTitle]    = useState('')

  // Compute distance from local points array
  let distM = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i-1], b = points[i]
    const Δlat = (+b.lat - +a.lat) * Math.PI / 180
    const Δlng = (+b.lng - +a.lng) * Math.PI / 180
    const φ1 = +a.lat * Math.PI / 180, φ2 = +b.lat * Math.PI / 180
    const x = Math.sin(Δlat/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δlng/2)**2
    distM += 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
  }

  if (!activeWalk) {
    return (
      <div style={S.bar}>
        <div style={S.dotIdle} />
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Walk title (optional)"
          style={{
            flex: 1, background: '#2a2d3e', border: '1px solid #3d405b',
            borderRadius: 6, padding: '6px 10px', color: '#e8eaf6', fontSize: 14,
          }}
        />
        <button
          style={{ ...S.btn, background: '#2e7d32', color: '#fff', padding: '8px 18px' }}
          disabled={starting}
          onClick={async () => {
            setStarting(true)
            await startWalk(title.trim() || undefined).catch(() => {})
            setStarting(false)
            setTitle('')
          }}
        >
          {starting ? '…' : 'Start Walk'}
        </button>
      </div>
    )
  }

  return (
    <div style={S.bar}>
      <div style={S.dot} />
      <div style={S.stats}>
        <div style={S.stat}>
          <span style={S.value}>{fmtDuration(seconds)}</span>
          <span style={S.label}>Time</span>
        </div>
        <div style={S.stat}>
          <span style={S.value}>{fmtDistance(distM)}</span>
          <span style={S.label}>Distance</span>
        </div>
        <div style={S.stat}>
          <span style={S.value}>{points.length}</span>
          <span style={S.label}>Points</span>
        </div>
      </div>
      <button style={{ ...S.btn, ...S.pinBtn }} onClick={onPin}>+ Pin</button>
      <button
        style={{ ...S.btn, ...S.endBtn }}
        disabled={ending}
        onClick={async () => {
          setEnding(true)
          await endWalk().catch(() => {})
          setEnding(false)
        }}
      >
        {ending ? '…' : 'End'}
      </button>
    </div>
  )
}
