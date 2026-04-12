import type { WebSocketServer as WssType, WebSocket } from 'ws'

export type PmWsEventType =
  | 'connected'
  | 'path.point'
  | 'entry.created'
  | 'entry.updated'
  | 'walk.ended'

export interface PmWsEvent {
  type:      PmWsEventType
  payload:   Record<string, unknown>
  timestamp: string
}

let _wss: WssType | null = null
const clients = new Set<WebSocket>()

export function initWss(wss: WssType): void {
  _wss = wss
  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws)
    ws.send(JSON.stringify({ type: 'connected', payload: {}, timestamp: new Date().toISOString() }))
    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))
  })
  console.log('[prayermap] WebSocket server ready')
}

export function broadcast(event: PmWsEvent): void {
  if (!_wss || clients.size === 0) return
  const msg = JSON.stringify(event)
  for (const client of clients) {
    if ((client as WebSocket & { readyState: number }).readyState === 1) {
      client.send(msg)
    }
  }
}

export function emitPathPoint(walkId: string, point: Record<string, unknown>): void {
  broadcast({ type: 'path.point', payload: { walkId, point }, timestamp: new Date().toISOString() })
}

export function emitEntryCreated(entry: Record<string, unknown>): void {
  broadcast({ type: 'entry.created', payload: { entry }, timestamp: new Date().toISOString() })
}

export function emitEntryUpdated(entry: Record<string, unknown>): void {
  broadcast({ type: 'entry.updated', payload: { entry }, timestamp: new Date().toISOString() })
}

export function emitWalkEnded(walk: Record<string, unknown>): void {
  broadcast({ type: 'walk.ended', payload: { walk }, timestamp: new Date().toISOString() })
}
