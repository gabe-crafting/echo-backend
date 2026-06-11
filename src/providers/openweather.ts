import { RawProviderForecast, RawProviderForecastHour, WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";
import { config } from "../config";

export async function fetchOpenWeatherForecast(
  lat: number,
  lon: number
): Promise<RawProviderForecast> {
  if (!config.openWeatherApiKey) throw new Error('OPENWEATHER_API_KEY not set');

  const url =
    `https://api.openweathermap.org/data/2.5/forecast` +
    `?lat=${lat}&lon=${lon}` +
    `&appid=${config.openWeatherApiKey}` +
    `&units=metric&cnt=40`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenWeatherMap forecast failed: ${res.status}`);
  const data = await res.json() as any;

  // Group 3-hour interval entries by calendar date
  const dayMap: Record<string, any[]> = {};
  for (const entry of data.list as any[]) {
    const date = new Date(entry.dt * 1000).toISOString().split('T')[0];
    (dayMap[date] ??= []).push(entry);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const daily = Object.entries(dayMap).map(([date, entries]) => {
    const temps = entries.map(e => e.main.temp as number);

    const hourly: RawProviderForecastHour[] = entries.map(e => {
      const t = new Date(e.dt * 1000);
      return {
        time: t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        temp: Math.round(e.main.temp),
        humidity: e.main.humidity as number,
        description: e.weather[0].description as string,
        windSpeed: Math.round(e.wind.speed * 10) / 10,
        rainChance: Math.round((e.pop ?? 0) * 100),
        precipitation: Math.round((e.rain?.['3h'] ?? 0) * 10) / 10,
      };
    });

    const descCounts: Record<string, number> = {};
    entries.forEach(e => {
      const d = e.weather[0].description as string;
      descCounts[d] = (descCounts[d] ?? 0) + 1;
    });
    const description = Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0][0];

    return {
      date,
      tempHigh: Math.round(Math.max(...temps)),
      tempLow: Math.round(Math.min(...temps)),
      humidity: Math.round(avg(entries.map(e => e.main.humidity))),
      description,
      windSpeed: Math.round(Math.max(...entries.map(e => e.wind.speed)) * 10) / 10,
      rainChance: Math.max(...entries.map(e => Math.round((e.pop ?? 0) * 100))),
      precipitation: Math.round(hourly.reduce((s, h) => s + h.precipitation, 0) * 10) / 10,
      hourly,
    };
  });

  return { name: 'OpenWeatherMap', daily };
}


// OpenWeatherMap current weather. Requires a free API key (OPENWEATHER_API_KEY).
export const openWeatherProvider: WeatherProvider = {
  name: 'OpenWeatherMap',

  async fetchCurrent(lat: number, lon: number): Promise<WeatherData> {
    if (!config.openWeatherApiKey) {
      // Thrown errors are caught by the service's Promise.allSettled,
      // so a missing key just drops this source from the response.
      throw new Error('OPENWEATHER_API_KEY is not set');
    }

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${lat}&lon=${lon}` +
      `&appid=${config.openWeatherApiKey}` +
      `&units=metric`; // °C and m/s, to match the other providers

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OpenWeatherMap responded ${res.status}`);
    }
    const data = await res.json();

    return {
      timestamp: new Date(data.dt * 1000).toISOString(),
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      // OWM only reports rain/snow when present, under a "1h" key.
      precipitation: data.rain?.['1h'] ?? data.snow?.['1h'] ?? 0,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      condition: data.weather?.[0]?.description ?? 'unknown',
      provider: this.name,
    };
  },

  async checkHealth() {
    // Without a key this provider can never connect — report it as unconfigured
    // rather than offline so the frontend can tell the two apart.
    if (!config.openWeatherApiKey) return { ok: false, configured: false };

    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=0&lon=0&appid=${config.openWeatherApiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: res.ok, configured: true };
  },
};
