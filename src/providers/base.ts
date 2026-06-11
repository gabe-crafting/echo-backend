import { WeatherData } from "../types/weather";

// Result of a provider's connectivity probe.
// `configured` is false when the provider can never connect without setup
// (e.g. a missing API key), which the frontend surfaces distinctly from a
// transient outage.
export interface ProviderHealth {
  ok: boolean;
  configured: boolean;
}

export interface WeatherProvider {
  name: string;
  // All capabilities are optional — each provider implements only what its API supports.
  // The service filters providers by capability before each fan-out.
  fetchCurrent?(lat: number, lon: number): Promise<WeatherData>;
  fetchForecast?(lat: number, lon: number, opts?: { days?: number }): Promise<WeatherData[]>;
  fetchHistory?(lat: number, lon: number, opts: { start: string; end: string }): Promise<WeatherData[]>;
  // Lightweight reachability probe. Each provider knows its own host, headers
  // and auth, so it owns the check; the service just fans out and times it.
  checkHealth?(): Promise<ProviderHealth>;
}