export interface WeatherData {
  timestamp: string;
  temperature: number;
  feelsLike?: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  windDirection?: number;
  condition: string;
  provider: string;
}

export interface AggregatedWeather {
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  // One entry per provider, keyed by provider name: { "Open-Meteo": {...} }
  sources: Record<string, WeatherData>[];
}

export interface HistoryWeather {
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  // One entry per provider, each holding an hourly series: { "ERA5": [ {...}, {...} ] }
  history: Record<string, WeatherData[]>[];
}

// ── Internal aggregation types ────────────────────────────────────────────────

export interface RawProviderForecastHour {
  time: string;
  temp: number;
  humidity: number;
  description: string;
  windSpeed: number;
  rainChance: number;  // 0-100
  precipitation: number; // mm
}

export interface RawProviderForecastDay {
  date: string;
  tempHigh: number;
  tempLow: number;
  humidity: number;
  description: string;
  windSpeed: number;
  rainChance: number;
  precipitation: number;
  hourly: RawProviderForecastHour[];
}

export interface RawProviderForecast {
  name: string;
  daily: RawProviderForecastDay[];
}

// ── Public API types ───────────────────────────────────────────────────────────

export interface ProviderDayForecast {
  tempHigh: number;
  tempLow: number;
  humidity: number;
  description: string;
  windSpeed: number;
  rainChance: number;
  precipitation: number;
}

export interface ProviderHourForecast {
  time: string;
  temp: number;
  humidity: number;
  description: string;
  windSpeed: number;
  rainChance: number;
  precipitation: number;
}

export interface MultiProviderDay {
  date: string;
  label: string;
  // Keyed by provider name, e.g. { "Open-Meteo": {...}, "MET Norway": {...} }
  providers: Record<string, ProviderDayForecast>;
  hourly: Record<string, ProviderHourForecast[]>;
}

export interface MultiProviderForecast {
  location: { lat: number; lon: number };
  providerNames: string[];
  daily: MultiProviderDay[];
}

export interface ProviderStatus {
  name: string;
  // online: reachable. offline: configured but unreachable/erroring.
  // unconfigured: missing setup (e.g. API key) so it can never connect.
  status: 'online' | 'offline' | 'unconfigured';
  // Round-trip time of the probe in ms, or null when the probe didn't complete.
  latencyMs: number | null;
}

export interface ProvidersStatus {
  providers: ProviderStatus[];
}

export interface StoredReadings {
  location: { lat: number; lon: number };
  // Stored readings grouped per provider, e.g. { "Open-Meteo": [ {...}, {...} ] }.
  // The frontend charts/compares these.
  readings: Record<string, {
    timestamp: string;
    temperature: number;
    humidity: number;
    precipitation: number;
    windSpeed: number;
    condition: string;
  }[]>[];
}