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
  current: WeatherData;
  hourly: WeatherData[];
  daily: any[];
  sources: string[];           // Which providers were used
  generatedAt: string;
}