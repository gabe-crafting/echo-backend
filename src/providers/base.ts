import { WeatherData } from "../types/weather";

export interface WeatherProvider {
  name: string;
  // All capabilities are optional — each provider implements only what its API supports.
  // The service filters providers by capability before each fan-out.
  fetchCurrent?(lat: number, lon: number): Promise<WeatherData>;
  fetchForecast?(lat: number, lon: number, opts?: { days?: number }): Promise<WeatherData[]>;
  fetchHistory?(lat: number, lon: number, opts: { start: string; end: string }): Promise<WeatherData[]>;
}