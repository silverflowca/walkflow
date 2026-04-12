// ── App shell / nav ───────────────────────────────────────────

import type { ReactNode } from 'react'

export type AppTab = 'map' | 'list'

interface Props {
  tab:      AppTab
  onTab:    (t: AppTab) => void
  children: ReactNode
}

const S: Record<string, React.CSSProperties> = {
  shell: {
    display: 'flex', flexDirection: 'column',
    height: '100%', width: '100%', overflow: 'hidden',
    background: '#0f1117',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', background: '#1a1d2e',
    borderBottom: '1px solid #2d3056', flexShrink: 0,
  },
  logo: {
    fontSize: 17, fontWeight: 700, color: '#7986cb',
    letterSpacing: -0.3,
  },
  navRow: { display: 'flex', gap: 4 },
  navBtn: (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
    fontSize: 13, fontWeight: 500,
    background: active ? '#3f51b5' : 'transparent',
    color: active ? '#fff' : '#7986cb',
  }),
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
}

export function Layout({ tab, onTab, children }: Props) {
  return (
    <div style={S.shell}>
      <header style={S.header}>
        <span style={S.logo}>🗺 PrayerMap</span>
        <nav style={S.navRow}>
          <button style={S.navBtn(tab === 'map')}  onClick={() => onTab('map')}>Map</button>
          <button style={S.navBtn(tab === 'list')} onClick={() => onTab('list')}>List</button>
        </nav>
      </header>
      <div style={S.content}>{children}</div>
    </div>
  )
}
