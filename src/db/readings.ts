import { db } from './index';
import type { WeatherData } from '../types/weather';

// Round coords so "44.4267" and "44.4301" land on the same location key.
const roundCoord = (n: number) => Math.round(n * 100) / 100;
// Truncate any timestamp to the hour so forecasts and ERA5 hours line up.
// "2026-06-04T15:30" -> "2026-06-04T15:00"
const toHour = (iso: string) => iso.slice(0, 13) + ':00';

const insertStmt = db.query(`
  INSERT OR REPLACE INTO readings
    (provider, lat, lon, target_time, fetched_at,
     temperature, humidity, precipitation, wind_speed, condition)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export function saveReading(
  lat: number,
  lon: number,
  w: WeatherData
): void {
  insertStmt.run(
    w.provider,
    roundCoord(lat),
    roundCoord(lon),
    toHour(w.timestamp),
    new Date().toISOString(),
    w.temperature,
    w.humidity,
    w.precipitation,
    w.windSpeed,
    w.condition
  );
}

// Forecasts are persisted so we can later see how a provider's prediction held
// up against ERA5 actuals. Two policies differ from current readings:
//   1. Keep the *latest* forecast for an hour, but only rewrite when it actually
//      changed. The UPSERT's WHERE guard makes an identical re-fetch a no-op, so
//      we never churn the row (or its fetched_at) with redundant writes.
//   2. Skip hours already in the past at fetch time — zero lead time, nothing to
//      evaluate, and ERA5 covers actuals. This also keeps write volume small.
const insertForecastStmt = db.query(`
  INSERT INTO readings
    (provider, lat, lon, target_time, fetched_at,
     temperature, humidity, precipitation, wind_speed, condition)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(provider, lat, lon, target_time) DO UPDATE SET
    fetched_at    = excluded.fetched_at,
    temperature   = excluded.temperature,
    humidity      = excluded.humidity,
    precipitation = excluded.precipitation,
    wind_speed    = excluded.wind_speed,
    condition     = excluded.condition
  WHERE temperature   IS NOT excluded.temperature
     OR humidity      IS NOT excluded.humidity
     OR precipitation IS NOT excluded.precipitation
     OR wind_speed    IS NOT excluded.wind_speed
     OR condition     IS NOT excluded.condition
`);

// One transaction for the whole batch — prepared once, runs all rows atomically.
const insertForecastBatch = db.transaction((rows: ForecastInsert[]) => {
  for (const r of rows) {
    insertForecastStmt.run(
      r.provider, r.lat, r.lon, r.hour, r.fetchedAt,
      r.temperature, r.humidity, r.precipitation, r.windSpeed, r.condition
    );
  }
  return rows.length;
});

interface ForecastInsert {
  provider: string;
  lat: number;
  lon: number;
  hour: string;
  fetchedAt: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
}

// Persist a provider forecast series (future hours only, deduped, batched).
// Returns the number of rows actually offered to the batch.
export function saveForecastReadings(
  lat: number,
  lon: number,
  forecast: WeatherData[]
): number {
  const rlat = roundCoord(lat);
  const rlon = roundCoord(lon);
  const fetchedAt = new Date().toISOString();
  const cutoff = toHour(fetchedAt); // keep the current hour and everything after

  const rows: ForecastInsert[] = [];
  for (const w of forecast) {
    const hour = toHour(w.timestamp);
    if (hour < cutoff) continue; // past hour — no lead time to evaluate
    rows.push({
      provider: w.provider,
      lat: rlat,
      lon: rlon,
      hour,
      fetchedAt,
      temperature: w.temperature,
      humidity: w.humidity,
      precipitation: w.precipitation,
      windSpeed: w.windSpeed,
      condition: w.condition,
    });
  }

  if (rows.length === 0) return 0;
  return insertForecastBatch(rows);
}

export interface StoredRow {
  provider: string;
  timestamp: string;     // the hour the reading is for
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
}

// Return every stored reading for a location within a date range,
// oldest first. The frontend groups/charts these however it wants.
const selectStmt = db.query(`
  SELECT provider,
         target_time   AS timestamp,
         temperature,
         humidity,
         precipitation,
         wind_speed    AS windSpeed,
         condition
  FROM readings
  WHERE lat = ? AND lon = ?
    AND target_time >= ? AND target_time <= ?
  ORDER BY target_time ASC
`);

export function getReadings(
  lat: number,
  lon: number,
  start: string,
  end: string
): StoredRow[] {
  // ISO strings sort lexicographically; append the end-of-day so `end` is inclusive.
  return selectStmt.all(
    roundCoord(lat),
    roundCoord(lon),
    start,
    end + 'T23:59'
  ) as StoredRow[];
}
