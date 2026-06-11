import { Database } from 'bun:sqlite';

// Single SQLite file, created on first run. Persists across restarts.
// DB_PATH lets deployments point this at a mounted volume (e.g. /data/weather.db
// on Fly.io) so the data survives redeploys; defaults to the local file in dev.
export const db = new Database(process.env.DB_PATH ?? 'weather.db');

// One table storing each provider's reading per location + hour.
// UNIQUE(...) keeps one row per source/location/hour, so re-fetching
// the same hour overwrites instead of piling up duplicates.
db.run(`
  CREATE TABLE IF NOT EXISTS readings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    provider      TEXT NOT NULL,
    lat           REAL NOT NULL,
    lon           REAL NOT NULL,
    target_time   TEXT NOT NULL,
    fetched_at    TEXT NOT NULL,
    temperature   REAL,
    humidity      REAL,
    precipitation REAL,
    wind_speed    REAL,
    condition     TEXT,
    UNIQUE(provider, lat, lon, target_time)
  )
`);
