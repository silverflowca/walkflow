// ── List view — entries + walks history ──────────────────────

import { useState, useEffect } from 'react'
import { entries as entriesApi, walks as walksApi } from '../lib/api.js'
import type { Entry, Walk } from '../lib/types.js'
import { fmtDateTime, fmtDistance, fmtDuration } from '../lib/geo.js'

const S: Record<string, React.CSSProperties> = {
  container: {
    height: '100%', overflowY: 'auto', padding: '16px 16px 80px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  tabs: { display: 'flex', gap: 0, borderBottom: '1px solid #2d3056', marginBottom: 8 },
  tab: (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', border: 'none', background: 'none',
    color: active ? '#7986cb' : '#555',
    borderBottom: active ? '2px solid #7986cb' : '2px solid transparent',
  }),
  card: {
    background: '#1a1d2e', borderRadius: 10,
    padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 5,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#e8eaf6' },
  cardMeta:  { fontSize: 12, color: '#7986cb' },
  cardBody:  { fontSize: 13, color: '#9fa8da', marginTop: 2 },
  pill: (colour: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 12,
    fontSize: 11, fontWeight: 600, background: colour + '33', color: colour,
    marginRight: 4,
  }),
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  stat: { fontSize: 12, color: '#555' },
}

const TYPE_COLOUR: Record<string, string> = {
  note: '#7986cb', prayer: '#81c784', intercession: '#ff8a65',
  praise: '#ffd54f', burden: '#ef5350',
}

export function ListView() {
  const [tab,     setTab]     = useState<'entries' | 'walks'>('entries')
  const [items,   setItems]   = useState<Entry[]>([])
  const [history, setHistory] = useState<Walk[]>([])
  const [loading, setLoading] = useState(false)

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

  return (
    <div style={S.container}>
      <div style={S.tabs}>
        <button style={S.tab(tab === 'entries')} onClick={() => setTab('entries')}>Pins</button>
        <button style={S.tab(tab === 'walks')}   onClick={() => setTab('walks')}>Walks</button>
      </div>

      {loading && <div style={{ color: '#555', textAlign: 'center', padding: 20 }}>Loading…</div>}

      {tab === 'entries' && !loading && items.map(e => (
        <div key={e.id} style={S.card}>
          <div style={S.row}>
            <span style={S.pill(TYPE_COLOUR[e.type] ?? '#7986cb')}>{e.type}</span>
            <span style={S.cardMeta}>{fmtDateTime(e.created_at)}</span>
          </div>
          {e.title && <div style={S.cardTitle}>{e.title}</div>}
          {e.body  && <div style={S.cardBody}>{e.body.slice(0, 120)}{e.body.length > 120 ? '…' : ''}</div>}
          {e.tags.length > 0 && (
            <div style={S.row}>
              {e.tags.map(t => <span key={t} style={{ ...S.cardMeta, color: '#3d405b' }}>#{t}</span>)}
            </div>
          )}
          <span style={S.stat}>📍 {(+e.lat).toFixed(5)}, {(+e.lng).toFixed(5)}</span>
        </div>
      ))}

      {tab === 'walks' && !loading && history.map(w => (
        <div key={w.id} style={S.card}>
          <div style={S.cardTitle}>{w.title ?? 'Untitled Walk'}</div>
          <div style={S.row}>
            <span style={S.cardMeta}>{fmtDateTime(w.started_at)}</span>
            {w.ended_at && (
              <>
                <span style={S.stat}>·</span>
                <span style={S.stat}>{fmtDuration((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 1000)}</span>
              </>
            )}
            {w.distance_m != null && (
              <>
                <span style={S.stat}>·</span>
                <span style={S.stat}>{fmtDistance(w.distance_m)}</span>
              </>
            )}
            <span style={S.stat}>· {w.entry_count} pins</span>
          </div>
          {!w.ended_at && <span style={{ ...S.pill('#4caf50'), display: 'inline-block', width: 'fit-content' }}>Active</span>}
        </div>
      ))}

      {!loading && (tab === 'entries' ? items.length : history.length) === 0 && (
        <div style={{ color: '#555', textAlign: 'center', padding: 40 }}>
          {tab === 'entries' ? 'No pins yet. Start a walk and drop a pin.' : 'No walks recorded yet.'}
        </div>
      )}
    </div>
  )
}
