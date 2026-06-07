import { WeatherData } from "../types/weather";
import { WeatherProvider } from "./base";
import { config } from "../config";

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
};
