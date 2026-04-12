// ── Modal / bottom-sheet for creating a prayer entry ─────────

import { useState } from 'react'
import { entries as entriesApi } from '../lib/api.js'
import type { Entry, EntryType } from '../lib/types.js'
import type { GpsPosition } from '../hooks/useGPS.js'
import { useWalkContext } from '../context/WalkContext.js'

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
    maxHeight: '80vh', overflowY: 'auto',
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
}

export function EntryCapture({ position, onSaved, onClose }: Props) {
  const { activeWalk } = useWalkContext()
  const [type,    setType]    = useState<EntryType>('prayer')
  const [title,   setTitle]   = useState('')
  const [body,    setBody]    = useState('')
  const [tags,    setTags]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const save = async () => {
    if (!position) { setError('Waiting for GPS…'); return }
    setSaving(true); setError(null)
    try {
      const entry = await entriesApi.create({
        lat:       position.lat,
        lng:       position.lng,
        accuracy_m: position.accuracy_m,
        walk_id:   activeWalk?.id,
        type,
        title:     title.trim() || undefined,
        body:      body.trim()  || undefined,
        tags:      tags.split(',').map(t => t.trim()).filter(Boolean),
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
          <button style={S.saveBtn} disabled={saving || !position} onClick={save}>
            {saving ? 'Saving…' : 'Save Pin'}
          </button>
        </div>
      </div>
    </div>
  )
}
