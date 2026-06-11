import { RawProviderForecast, RawProviderForecastHour, WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";

const UA = 'multi-weather-aggregator/1.0 github.com/echo-backend';

export async function fetchMetNorwayForecast(
  lat: number,
  lon: number
): Promise<RawProviderForecast> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`MET Norway forecast failed: ${res.status}`);
  const data = await res.json() as any;

  // Group hourly timeseries entries by calendar date
  const dayMap: Record<string, any[]> = {};
  for (const entry of data.properties.timeseries as any[]) {
    const date = (entry.time as string).split('T')[0];
    (dayMap[date] ??= []).push(entry);
  }

  const daily = Object.entries(dayMap).slice(0, 7).map(([date, entries]) => {
    const temps = entries.map(e => e.data.instant.details.air_temperature as number);
    const humidities = entries.map(e => e.data.instant.details.relative_humidity as number);
    const windSpeeds = entries.map(e => e.data.instant.details.wind_speed as number);

    const hourly: RawProviderForecastHour[] = entries.map(e => {
      const next = e.data.next_1_hours ?? e.data.next_6_hours ?? {};
      return {
        time: (e.time as string).split('T')[1].slice(0, 5),
        temp: Math.round(e.data.instant.details.air_temperature),
        humidity: Math.round(e.data.instant.details.relative_humidity),
        description: mapSymbolCode(next?.summary?.symbol_code),
        windSpeed: Math.round(e.data.instant.details.wind_speed * 10) / 10,
        rainChance: 0, // MET Norway compact doesn't provide precipitation probability
        precipitation: Math.round((next?.details?.precipitation_amount ?? 0) * 10) / 10,
      };
    });

    const descCounts: Record<string, number> = {};
    hourly.forEach(h => { descCounts[h.description] = (descCounts[h.description] ?? 0) + 1; });
    const description = Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return {
      date,
      tempHigh: Math.round(Math.max(...temps)),
      tempLow: Math.round(Math.min(...temps)),
      humidity: Math.round(avg(humidities)),
      description,
      windSpeed: Math.round(Math.max(...windSpeeds) * 10) / 10,
      rainChance: 0,
      precipitation: Math.round(hourly.reduce((s, h) => s + h.precipitation, 0) * 10) / 10,
      hourly,
    };
  });

  return { name: 'MET Norway', daily };
}


export const metNorwayProvider: WeatherProvider = {
  name: 'MET Norway',

  async fetchCurrent(lat: number, lon: number): Promise<WeatherData> {
    const url =
      `https://api.met.no/weatherapi/locationforecast/2.0/compact` +
      `?lat=${lat}&lon=${lon}`;

    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const data = await res.json();

    const now = data.properties.timeseries[0];
    const instant = now.data.instant.details;
    const next1h = now.data.next_1_hours;

    return {
      timestamp: now.time,
      temperature: instant.air_temperature,
      humidity: instant.relative_humidity,
      precipitation: next1h?.details?.precipitation_amount ?? 0,
      windSpeed: instant.wind_speed,
      windDirection: instant.wind_from_direction,
      condition: mapSymbolCode(next1h?.summary?.symbol_code),
      provider: this.name,
    };
  },

  async checkHealth() {
    const url =
      `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=0&lon=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, configured: true };
  },
};

function mapSymbolCode(code?: string): string {
  if (!code) return 'unknown';
  // Symbol codes look like "partlycloudy_day" / "rain" / "clearsky_night".
  // Strip the day/night suffix and split camel-ish words into readable text.
  return code.replace(/_(day|night|polartwilight)$/, '');
}
