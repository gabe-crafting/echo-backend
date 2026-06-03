import { WeatherData } from "../types/weather";

export interface WeatherProvider {
  name: string;
  fetchCurrent(lat: number, lon: number): Promise<WeatherData>;
  fetchForecast?(lat: number, lon: number): Promise<any>;
}