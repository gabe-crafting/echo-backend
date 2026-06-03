import { providers } from '../providers/index.ts';
import type { AggregatedWeather, WeatherData } from '../types/weather.ts';

export const weatherService = {
  async getAggregatedWeather(lat: number, lon: number): Promise<AggregatedWeather> {
    const results = await Promise.allSettled(
      providers.map(p => p.fetchCurrent(lat, lon))
    );

    const successfulData = results
      .filter((r): r is PromiseFulfilledResult<WeatherData> => r.status === 'fulfilled')
      .map(r => r.value);

    const current = combineWeatherData(successfulData);

    return {
      location: { lat, lon },
      current,
      hourly: [],           // TODO: later
      daily: [],
      sources: successfulData.map(d => d.provider),
      generatedAt: new Date().toISOString(),
    };
  }
};

// Pure function - easy to test
function combineWeatherData(data: WeatherData[]): WeatherData {
  if (data.length === 0) throw new Error('No weather data available');

  const avgTemp = data.reduce((sum, d) => sum + d.temperature, 0) / data.length;
  const avgHumidity = data.reduce((sum, d) => sum + d.humidity, 0) / data.length;

  // You can make this much smarter later (weighting, prioritizing Romanian sources, etc.)
  return {
    ...data[0],                    // base on first successful provider
    temperature: Math.round(avgTemp * 10) / 10,
    humidity: Math.round(avgHumidity),
    provider: 'aggregated',
  };
}