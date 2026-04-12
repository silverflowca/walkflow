// ── Active walk context ───────────────────────────────────────

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { walks as walksApi } from '../lib/api.js'
import type { Walk } from '../lib/types.js'

interface WalkContextValue {
  activeWalk:  Walk | null
  startWalk:   (title?: string) => Promise<Walk>
  endWalk:     () => Promise<Walk | null>
  setActive:   (w: Walk | null) => void
}

const WalkContext = createContext<WalkContextValue | null>(null)

export function WalkProvider({ children }: { children: ReactNode }) {
  const [activeWalk, setActive] = useState<Walk | null>(null)

  const startWalk = useCallback(async (title?: string): Promise<Walk> => {
    const w = await walksApi.create(title)
    setActive(w)
    return w
  }, [])

  const endWalk = useCallback(async (): Promise<Walk | null> => {
    if (!activeWalk) return null
    const w = await walksApi.end(activeWalk.id)
    setActive(null)
    return w
  }, [activeWalk])

  return (
    <WalkContext.Provider value={{ activeWalk, startWalk, endWalk, setActive }}>
      {children}
    </WalkContext.Provider>
  )
}

export function useWalkContext() {
  const ctx = useContext(WalkContext)
  if (!ctx) throw new Error('useWalkContext must be inside WalkProvider')
  return ctx
}
