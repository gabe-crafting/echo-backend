import { WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";
import { mapWmoCode } from "../utils/wmo";

// ERA5 historical reanalysis, accessed via Open-Meteo's archive host.
// Note: the archive lags real-time by ~5 days; recent dates won't be available.
export const era5Provider: WeatherProvider = {
  name: 'ERA5',

  async fetchHistory(
    lat: number,
    lon: number,
    opts: { start: string; end: string }
  ): Promise<WeatherData[]> {
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat}&longitude=${lon}` +
      `&start_date=${opts.start}&end_date=${opts.end}` +
      `&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,weather_code` +
      `&timezone=Europe/Bucharest`;

    const res = await fetch(url);
    const data = await res.json();
    const h = data.hourly;

    // The archive returns parallel arrays (time[], temperature_2m[], ...).
    // Zip them by index into one WeatherData per hour.
    return h.time.map((time: string, i: number): WeatherData => ({
      timestamp: time,
      temperature: h.temperature_2m[i],
      humidity: h.relative_humidity_2m[i],
      precipitation: h.precipitation[i] ?? 0,
      windSpeed: h.wind_speed_10m[i],
      windDirection: h.wind_direction_10m[i],
      condition: mapWmoCode(h.weather_code[i]),
      provider: this.name,
    }));
  },

  async checkHealth() {
    // Probe the archive host with a tiny, long-settled date so it always has data.
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=0&longitude=0&start_date=2020-01-01&end_date=2020-01-01` +
      `&hourly=temperature_2m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, configured: true };
  },
};
