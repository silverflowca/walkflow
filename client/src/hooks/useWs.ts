// ── WebSocket hook ────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react'
import type { WsEvent } from '../lib/types.js'

type Handler = (event: WsEvent) => void

const WS_URL = import.meta.env.VITE_WS_URL
  ? `${import.meta.env.VITE_WS_URL}/ws`
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`

export function useWs(onEvent: Handler) {
  const wsRef      = useRef<WebSocket | null>(null)
  const handlerRef = useRef<Handler>(onEvent)
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  handlerRef.current = onEvent

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const evt = JSON.parse(e.data) as WsEvent
        handlerRef.current(evt)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      // auto-reconnect after 3 s
      retryRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
