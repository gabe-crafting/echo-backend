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
