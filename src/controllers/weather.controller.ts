import { weatherService } from '../services/weather.service';
import type { AggregatedWeather, HistoryWeather, MultiProviderForecast, StoredReadings } from '../types/weather';

export const weatherController = {
  async getForecast(lat: number, lon: number): Promise<MultiProviderForecast> {
    return weatherService.getForecast(lat, lon);
  },

  async getCurrent(
    lat: number,
    lon: number
  ): Promise<AggregatedWeather> {
    return weatherService.getAggregatedWeather(lat, lon);
  },

  async getHistory(
    lat: number,
    lon: number,
    start: string,
    end: string
  ): Promise<HistoryWeather> {
    return weatherService.getHistory(lat, lon, start, end);
  },

  async getReadings(
    lat: number,
    lon: number,
    start: string,
    end: string
  ): Promise<StoredReadings> {
    return weatherService.getReadings(lat, lon, start, end);
  }
};
