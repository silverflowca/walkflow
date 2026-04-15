// ── Theme context — 10 colour schemes ─────────────────────────

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface Theme {
  id:      string
  name:    string
  // Background layers
  bg:      string   // app background
  bgCard:  string   // card surface
  bgSheet: string   // bottom sheet / modal
  // Border
  border:  string
  // Text
  textPrimary:   string
  textSecondary: string
  textMuted:     string
  // Accent (walk active, highlights)
  accent:  string
  accentMuted: string
  // Status colours (fixed per theme)
  prayer:       string
  praise:       string
  intercession: string
  burden:       string
  note:         string
  // Map tile style
  tileUrl: string
  tileAttr: string
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    bg: '#0a0c14', bgCard: 'rgba(255,255,255,0.04)', bgSheet: '#111320',
    border: 'rgba(255,255,255,0.08)', textPrimary: '#f0f2ff',
    textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.25)',
    accent: '#5c6bc0', accentMuted: 'rgba(92,107,192,0.2)',
    prayer: '#81c784', praise: '#ffd54f', intercession: '#ff8a65', burden: '#ef5350', note: '#7986cb',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'deep-navy',
    name: 'Deep Navy',
    bg: '#060d1f', bgCard: 'rgba(30,60,120,0.18)', bgSheet: '#0c1830',
    border: 'rgba(100,160,255,0.12)', textPrimary: '#e8f0ff',
    textSecondary: 'rgba(200,220,255,0.6)', textMuted: 'rgba(150,180,255,0.3)',
    accent: '#4488ff', accentMuted: 'rgba(68,136,255,0.2)',
    prayer: '#64ffda', praise: '#ffcc02', intercession: '#ff7043', burden: '#ff5252', note: '#82b1ff',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#0a120a', bgCard: 'rgba(76,175,80,0.07)', bgSheet: '#0f1a0f',
    border: 'rgba(76,175,80,0.15)', textPrimary: '#e8f5e9',
    textSecondary: 'rgba(200,230,200,0.6)', textMuted: 'rgba(150,200,150,0.35)',
    accent: '#43a047', accentMuted: 'rgba(67,160,71,0.2)',
    prayer: '#a5d6a7', praise: '#fff176', intercession: '#ffab40', burden: '#ef9a9a', note: '#90caf9',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#12080a', bgCard: 'rgba(255,87,34,0.07)', bgSheet: '#1a0c0e',
    border: 'rgba(255,87,34,0.15)', textPrimary: '#fff3e0',
    textSecondary: 'rgba(255,220,180,0.6)', textMuted: 'rgba(200,150,120,0.35)',
    accent: '#ff5722', accentMuted: 'rgba(255,87,34,0.2)',
    prayer: '#a5d6a7', praise: '#ffe082', intercession: '#ffab40', burden: '#ef9a9a', note: '#ce93d8',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'purple-rain',
    name: 'Purple Rain',
    bg: '#0d0814', bgCard: 'rgba(156,39,176,0.08)', bgSheet: '#140c1e',
    border: 'rgba(156,39,176,0.18)', textPrimary: '#f3e5f5',
    textSecondary: 'rgba(220,180,255,0.6)', textMuted: 'rgba(170,130,220,0.35)',
    accent: '#9c27b0', accentMuted: 'rgba(156,39,176,0.2)',
    prayer: '#80cbc4', praise: '#fff59d', intercession: '#ffcc80', burden: '#ef9a9a', note: '#ce93d8',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    bg: '#f0f4f8', bgCard: 'rgba(0,0,0,0.04)', bgSheet: '#ffffff',
    border: 'rgba(0,0,0,0.1)', textPrimary: '#1a1e2e',
    textSecondary: 'rgba(30,40,80,0.6)', textMuted: 'rgba(30,40,80,0.35)',
    accent: '#1565c0', accentMuted: 'rgba(21,101,192,0.15)',
    prayer: '#2e7d32', praise: '#f57f17', intercession: '#bf360c', burden: '#b71c1c', note: '#1a237e',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    bg: '#1a1208', bgCard: 'rgba(200,160,80,0.08)', bgSheet: '#221808',
    border: 'rgba(200,160,80,0.18)', textPrimary: '#f5e6c8',
    textSecondary: 'rgba(220,190,130,0.65)', textMuted: 'rgba(180,150,100,0.4)',
    accent: '#c8961e', accentMuted: 'rgba(200,150,30,0.2)',
    prayer: '#a5d6a7', praise: '#ffe082', intercession: '#ffab40', burden: '#ef9a9a', note: '#b0bec5',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    bg: '#0f0808', bgCard: 'rgba(183,28,28,0.08)', bgSheet: '#180c0c',
    border: 'rgba(183,28,28,0.2)', textPrimary: '#ffebee',
    textSecondary: 'rgba(255,200,200,0.6)', textMuted: 'rgba(200,150,150,0.35)',
    accent: '#c62828', accentMuted: 'rgba(198,40,40,0.2)',
    prayer: '#a5d6a7', praise: '#fff176', intercession: '#ffcc80', burden: '#ef9a9a', note: '#b0bec5',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'teal-mist',
    name: 'Teal Mist',
    bg: '#04100f', bgCard: 'rgba(0,150,136,0.08)', bgSheet: '#081a18',
    border: 'rgba(0,150,136,0.2)', textPrimary: '#e0f2f1',
    textSecondary: 'rgba(170,230,220,0.6)', textMuted: 'rgba(120,190,180,0.35)',
    accent: '#00897b', accentMuted: 'rgba(0,137,123,0.2)',
    prayer: '#80cbc4', praise: '#fff59d', intercession: '#ffab40', burden: '#ef9a9a', note: '#90caf9',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    bg: '#120a0c', bgCard: 'rgba(233,30,99,0.07)', bgSheet: '#1e0e14',
    border: 'rgba(233,30,99,0.15)', textPrimary: '#fce4ec',
    textSecondary: 'rgba(255,180,200,0.6)', textMuted: 'rgba(200,130,150,0.35)',
    accent: '#e91e63', accentMuted: 'rgba(233,30,99,0.2)',
    prayer: '#80cbc4', praise: '#fff59d', intercession: '#ffcc80', burden: '#ef9a9a', note: '#ce93d8',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    tileAttr: '© OpenStreetMap contributors',
  },
]

interface ThemeContextValue {
  theme:    Theme
  themeId:  string
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    THEMES[0],
  themeId:  THEMES[0].id,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<string>(() => {
    return localStorage.getItem('pm_theme') ?? THEMES[0].id
  })

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]

  const setTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem('pm_theme', id)
  }

  // Apply bg colour to document so address bar matches on mobile
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg)
    document.body.style.background = theme.bg
  }, [theme.bg])

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
