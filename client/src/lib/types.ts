// ── Domain types mirroring the DB schema ─────────────────────

export interface Walk {
  id:           string
  user_id:      string
  title:        string | null
  started_at:   string
  ended_at:     string | null
  distance_m:   number | null
  entry_count:  number
  bbox:         BBox | null
  created_at:   string
}

export interface BBox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface PathPoint {
  id:          string
  walk_id:     string
  seq:         number
  lat:         number
  lng:         number
  accuracy_m:  number | null
  altitude_m:  number | null
  recorded_at: string
}

export type EntryType = 'note' | 'prayer' | 'intercession' | 'praise' | 'burden'

export interface Entry {
  id:          string
  walk_id:     string | null
  user_id:     string
  lat:         number
  lng:         number
  accuracy_m:  number | null
  type:        EntryType
  title:       string | null
  body:        string | null
  tags:        string[]
  ai_summary:  string | null
  created_at:  string
  updated_at:  string
  pm_entry_media?: Media[]
}

export interface Media {
  id:          string
  entry_id:    string
  kind:        'photo' | 'audio'
  url:         string
  filename:    string | null
  size_bytes:  number | null
  duration_s:  number | null
  created_at:  string
}

export interface PathStats {
  pointCount: number
  distanceM:  number
  durationS:  number
  bbox:       BBox | null
}

// ── WebSocket event shapes ────────────────────────────────────

export type WsEvent =
  | { type: 'connected' }
  | { type: 'path.point';     walkId: string; point: PathPoint }
  | { type: 'entry.created';  entry: Entry }
  | { type: 'entry.updated';  entry: Entry }
  | { type: 'walk.ended';     walk: Walk }
