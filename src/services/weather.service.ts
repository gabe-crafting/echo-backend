import { providers } from '../providers/index.js';
import type { AggregatedWeather, HistoryWeather, StoredReadings, WeatherData } from '../types/weather.ts';
import { saveReading, getReadings } from '../db/readings.js';

export const weatherService = {
  async getAggregatedWeather(lat: number, lon: number): Promise<AggregatedWeather> {
    // Only providers that can report current weather.
    const capable = providers.filter(p => p.fetchCurrent);

    const results = await Promise.allSettled(
      capable.map(p => p.fetchCurrent!(lat, lon))
    );

    const values = results
      .filter((r): r is PromiseFulfilledResult<WeatherData> => r.status === 'fulfilled')
      .map(r => r.value);

    // Persist each source's reading so the frontend can chart it by date.
    values.forEach(w => saveReading(lat, lon, w));

    const sources = values.map(w => ({ [w.provider]: w }));

    return {
      location: { lat, lon },
      sources,
    };
  },

  async getReadings(
    lat: number,
    lon: number,
    start: string,
    end: string
  ): Promise<StoredReadings> {
    const rows = getReadings(lat, lon, start, end);

    // Group flat rows into one series per provider for easy charting.
    const byProvider: Record<string, StoredReadings['readings'][number][string]> = {};
    for (const { provider, ...point } of rows) {
      (byProvider[provider] ??= []).push(point);
    }

    const readings = Object.entries(byProvider).map(
      ([provider, series]) => ({ [provider]: series })
    );

    return { location: { lat, lon }, readings };
  },

  async getHistory(
    lat: number,
    lon: number,
    start: string,
    end: string
  ): Promise<HistoryWeather> {
    // Only providers that can serve historical data (e.g. ERA5).
    const capable = providers.filter(p => p.fetchHistory);

    const results = await Promise.allSettled(
      capable.map(p => p.fetchHistory!(lat, lon, { start, end }))
    );

    // Pair each result with its provider name (index-aligned with `capable`).
    const history = results
      .map((r, i) => ({ name: capable[i].name, result: r }))
      .filter(x => x.result.status === 'fulfilled')
      .map(x => ({
        [x.name]: (x.result as PromiseFulfilledResult<WeatherData[]>).value,
      }));
      // Note: ERA5 history is static and already cached upstream, so we
      // fetch it on demand rather than persisting it.

    return {
      location: { lat, lon },
      history,
    };
  }
};