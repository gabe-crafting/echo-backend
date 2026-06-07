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