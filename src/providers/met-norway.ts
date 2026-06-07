import { WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";

export const metNorwayProvider: WeatherProvider = {
  name: 'MET Norway',

  async fetchCurrent(lat: number, lon: number): Promise<WeatherData> {
    const url =
      `https://api.met.no/weatherapi/locationforecast/2.0/compact` +
      `?lat=${lat}&lon=${lon}`;

    const res = await fetch(url, {
      // MET Norway requires an identifying User-Agent or it returns 403.
      headers: { 'User-Agent': 'multi-weather-aggregator/1.0 github.com/echo-backend' },
    });
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
};

function mapSymbolCode(code?: string): string {
  if (!code) return 'unknown';
  // Symbol codes look like "partlycloudy_day" / "rain" / "clearsky_night".
  // Strip the day/night suffix and split camel-ish words into readable text.
  return code.replace(/_(day|night|polartwilight)$/, '');
}
