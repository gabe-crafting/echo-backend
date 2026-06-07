import { RawProviderForecast, RawProviderForecastHour, WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";
import { mapWmoCode } from "../utils/wmo";

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  days = 7
): Promise<RawProviderForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,precipitation` +
    `&timezone=auto` +
    `&forecast_days=${days}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
  const data = await res.json() as any;

  const daily = (data.daily.time as string[]).map((date, i) => {
    const hourly: RawProviderForecastHour[] = (data.hourly.time as string[])
      .reduce<RawProviderForecastHour[]>((acc, t, hi) => {
        if (!t.startsWith(date)) return acc;
        acc.push({
          time: t.split('T')[1].slice(0, 5),
          temp: Math.round(data.hourly.temperature_2m[hi]),
          humidity: Math.round(data.hourly.relative_humidity_2m[hi]),
          description: mapWmoCode(data.hourly.weather_code[hi]),
          windSpeed: Math.round(data.hourly.wind_speed_10m[hi] * 10) / 10,
          rainChance: Math.round(data.hourly.precipitation_probability[hi] ?? 0),
          precipitation: Math.round((data.hourly.precipitation[hi] ?? 0) * 10) / 10,
        });
        return acc;
      }, []);

    const avgHumidity = hourly.length
      ? Math.round(hourly.reduce((s, h) => s + h.humidity, 0) / hourly.length)
      : 0;

    return {
      date,
      tempHigh: Math.round(data.daily.temperature_2m_max[i]),
      tempLow: Math.round(data.daily.temperature_2m_min[i]),
      humidity: avgHumidity,
      rainChance: data.daily.precipitation_probability_max[i] ?? 0,
      precipitation: Math.round((data.daily.precipitation_sum[i] ?? 0) * 10) / 10,
      description: mapWmoCode(data.daily.weather_code[i]),
      windSpeed: Math.round(data.daily.wind_speed_10m_max[i] * 10) / 10,
      hourly,
    };
  });

  return { name: 'Open-Meteo', daily };
}

export const openMeteoProvider: WeatherProvider = {
  name: 'Open-Meteo',

  async fetchCurrent(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
      `&timezone=Europe/Bucharest`;

    const res = await fetch(url);
    const data = await res.json();

    return {
      timestamp: new Date().toISOString(),
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation ?? 0,
      windSpeed: data.current.wind_speed_10m,
      condition: mapWmoCode(data.current.weather_code),
      provider: this.name,
    };
  },
};