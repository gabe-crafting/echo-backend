import { WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";
import { mapWmoCode } from "../utils/wmo";

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