// ── Theme chooser bottom sheet ─────────────────────────────────

import { useTheme, THEMES } from '../context/ThemeContext.js'

interface Props {
  onClose: () => void
}

export function ThemeChooser({ onClose }: Props) {
  const { themeId, setTheme, theme } = useTheme()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          background: theme.bgSheet,
          borderRadius: '24px 24px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          border: `1px solid ${theme.border}`,
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.border }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 14px',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary }}>
            🎨 Colour Theme
          </div>
          <button
            onClick={onClose}
            style={{
              background: theme.bgCard, border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer',
              color: theme.textSecondary, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Theme grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10, padding: '0 16px 20px',
        }}>
          {THEMES.map(t => {
            const active = t.id === themeId
            return (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); onClose() }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 4px 8px',
                  borderRadius: 16,
                  border: active ? `2px solid ${t.accent}` : `1.5px solid ${t.border ?? 'rgba(255,255,255,0.1)'}`,
                  background: active ? `${t.accent}18` : t.bgCard,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: 'none',
                }}
              >
                {/* Swatch */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: t.bg,
                  border: `2px solid ${t.accent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
                    <div style={{ flex: 1, background: t.accent }} />
                    <div style={{ flex: 1, background: t.prayer }} />
                  </div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                  color: active ? t.accent : theme.textMuted,
                  textAlign: 'center', lineHeight: 1.2,
                }}>
                  {t.name.toUpperCase()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
