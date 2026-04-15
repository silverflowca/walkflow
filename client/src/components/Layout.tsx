// ── App shell — mobile-native layout ─────────────────────────

import type { ReactNode } from 'react'
import { useTheme } from '../context/ThemeContext.js'

export type AppTab = 'map' | 'list'

interface Props {
  tab:      AppTab
  onTab:    (t: AppTab) => void
  onTheme?: () => void
  children: ReactNode
}

const TAB_ITEMS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'map',  label: 'Map',  icon: '🗺' },
  { id: 'list', label: 'Pins', icon: '📍' },
]

export function Layout({ tab, onTab, onTheme, children }: Props) {
  const { theme } = useTheme()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%', overflow: 'hidden',
      background: theme.bg,
    }}>
      {/* Safe area top */}
      <div style={{ height: 'env(safe-area-inset-top, 0px)', background: theme.bg, flexShrink: 0 }} />

      {/* Top app bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px 0 20px', height: 52,
        background: theme.bg,
        flexShrink: 0,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>🙏</div>
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.5 }}>
            PrayerMap
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onTheme && (
            <button
              onClick={onTheme}
              style={{
                background: theme.bgCard, border: `1px solid ${theme.border}`,
                borderRadius: 10, width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 16,
              }}
              title="Change theme"
            >🎨</button>
          )}
          <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, letterSpacing: 1 }}>BETA</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </div>

      {/* Bottom tab bar */}
      <div style={{
        display: 'flex',
        background: theme.bg,
        borderTop: `1px solid ${theme.border}`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0,
      }}>
        {TAB_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onTab(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '10px 0 12px',
              border: 'none', background: 'none', cursor: 'pointer',
              position: 'relative',
            }}
          >
            {tab === item.id && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: 28, height: 2,
                borderRadius: '0 0 2px 2px',
                background: theme.accent,
              }} />
            )}
            <span style={{ fontSize: 21, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              color: tab === item.id ? theme.accent : theme.textMuted,
            }}>{item.label.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
