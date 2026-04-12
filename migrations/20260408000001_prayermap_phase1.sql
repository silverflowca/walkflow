-- ============================================================
-- PrayerMap Phase 1 — d2flow schema, pm_ prefix
-- Tables: pm_walks, pm_path_points, pm_entries, pm_entry_media
-- ============================================================

-- One prayer-walking session (start → end)
CREATE TABLE IF NOT EXISTS d2flow.pm_walks (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text        NOT NULL,
  title         text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  distance_m    numeric,                          -- Haversine sum, populated on end
  entry_count   int         NOT NULL DEFAULT 0,
  bbox          jsonb,                            -- { minLat, minLng, maxLat, maxLng }
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- GPS waypoints recorded every ~15 seconds during a walk
CREATE TABLE IF NOT EXISTS d2flow.pm_path_points (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id     uuid        NOT NULL REFERENCES d2flow.pm_walks(id) ON DELETE CASCADE,
  seq         int         NOT NULL,               -- monotonically increasing per walk
  lat         numeric(10,7) NOT NULL,
  lng         numeric(10,7) NOT NULL,
  accuracy_m  numeric,
  altitude_m  numeric,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (walk_id, seq)
);

-- Geo-tagged journal / prayer entries (walk_id optional for standalone entries)
CREATE TABLE IF NOT EXISTS d2flow.pm_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id     uuid        REFERENCES d2flow.pm_walks(id) ON DELETE SET NULL,
  user_id     text        NOT NULL,
  lat         numeric(10,7) NOT NULL,
  lng         numeric(10,7) NOT NULL,
  accuracy_m  numeric,
  type        text        NOT NULL DEFAULT 'note',  -- note|prayer|intercession|praise|burden
  title       text,
  body        text,
  tags        text[]      NOT NULL DEFAULT '{}',
  ai_summary  text,                                 -- Phase 3: AI-generated summary
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Photos / audio clips attached to an entry
CREATE TABLE IF NOT EXISTS d2flow.pm_entry_media (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id    uuid        NOT NULL REFERENCES d2flow.pm_entries(id) ON DELETE CASCADE,
  kind        text        NOT NULL,                 -- photo|audio
  url         text        NOT NULL,
  filename    text,
  size_bytes  int,
  duration_s  numeric,                              -- audio only
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS pm_walks_user        ON d2flow.pm_walks(user_id);
CREATE INDEX IF NOT EXISTS pm_walks_started     ON d2flow.pm_walks(started_at DESC);
CREATE INDEX IF NOT EXISTS pm_path_walk_seq     ON d2flow.pm_path_points(walk_id, seq);
CREATE INDEX IF NOT EXISTS pm_entries_user      ON d2flow.pm_entries(user_id);
CREATE INDEX IF NOT EXISTS pm_entries_walk      ON d2flow.pm_entries(walk_id);
CREATE INDEX IF NOT EXISTS pm_entries_latlon    ON d2flow.pm_entries(lat, lng);
CREATE INDEX IF NOT EXISTS pm_entries_created   ON d2flow.pm_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS pm_entry_media_entry ON d2flow.pm_entry_media(entry_id);
