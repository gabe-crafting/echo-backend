import { providers } from '../providers/index.js';
import type { AggregatedWeather, HistoryWeather, MultiProviderDay, MultiProviderForecast, ProvidersStatus, ProviderStatus, RawProviderForecast, StoredReadings, WeatherData } from '../types/weather.ts';
import { saveReading, getReadings, saveForecastReadings } from '../db/readings.js';
import { fetchOpenMeteoForecast } from '../providers/open-meteo.js';
import { fetchMetNorwayForecast } from '../providers/met-norway.js';
import { fetchOpenWeatherForecast } from '../providers/openweather.js';

// Flatten provider forecasts into per-hour WeatherData rows for persistence.
// Provider hours carry only the clock time ("HH:MM"); the date lives on the
// parent day, so combine them into a full "YYYY-MM-DDTHH:MM" timestamp that
// matches how ERA5 and current readings are stored.
function forecastToReadings(providerResults: RawProviderForecast[]): WeatherData[] {
  const out: WeatherData[] = [];
  for (const p of providerResults) {
    for (const day of p.daily) {
      for (const h of day.hourly) {
        out.push({
          timestamp: `${day.date}T${h.time}`,
          temperature: h.temp,
          humidity: h.humidity,
          precipitation: h.precipitation,
          windSpeed: h.windSpeed,
          condition: h.description,
          provider: p.name,
        });
      }
    }
  }
  return out;
}

export const weatherService = {
  // Probe every provider's connectivity in parallel and report per-provider
  // status + latency. One slow/failing provider never blocks or breaks the rest.
  async getProviderStatuses(): Promise<ProvidersStatus> {
    const statuses = await Promise.all(
      providers.map(async (p): Promise<ProviderStatus> => {
        if (!p.checkHealth) {
          return { name: p.name, status: 'offline', latencyMs: null };
        }
        const started = Date.now();
        try {
          const health = await p.checkHealth();
          const latencyMs = Date.now() - started;
          if (!health.configured) {
            return { name: p.name, status: 'unconfigured', latencyMs: null };
          }
          return { name: p.name, status: health.ok ? 'online' : 'offline', latencyMs };
        } catch {
          return { name: p.name, status: 'offline', latencyMs: null };
        }
      })
    );

    return { providers: statuses };
  },

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

  async getForecast(lat: number, lon: number): Promise<MultiProviderForecast> {
    const results = await Promise.allSettled([
      fetchOpenMeteoForecast(lat, lon, 7),
      fetchMetNorwayForecast(lat, lon),
      fetchOpenWeatherForecast(lat, lon),
    ]);

    const providerResults: RawProviderForecast[] = results
      .filter((r): r is PromiseFulfilledResult<RawProviderForecast> => r.status === 'fulfilled')
      .map(r => r.value);

    // Record each provider's prediction so a later history view can compare it
    // against ERA5 actuals. Deferred so it never adds latency to this response;
    // deduped + future-only in the db layer so it writes nothing redundant.
    queueMicrotask(() => {
      try {
        saveForecastReadings(lat, lon, forecastToReadings(providerResults));
      } catch (err) {
        console.error('[forecast persistence] failed:', err);
      }
    });

    // Union of all dates across providers, sorted ascending
    const allDates = [...new Set(providerResults.flatMap(p => p.daily.map(d => d.date)))].sort();

    const daily: MultiProviderDay[] = allDates.map(date => {
      const providers: MultiProviderDay['providers'] = {};
      const hourly: MultiProviderDay['hourly'] = {};

      for (const p of providerResults) {
        const day = p.daily.find(d => d.date === date);
        if (!day) continue;
        providers[p.name] = {
          tempHigh: day.tempHigh,
          tempLow: day.tempLow,
          humidity: day.humidity,
          description: day.description,
          windSpeed: day.windSpeed,
          rainChance: day.rainChance,
          precipitation: day.precipitation,
        };
        hourly[p.name] = day.hourly;
      }

      return {
        date,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        providers,
        hourly,
      };
    });

    return {
      location: { lat, lon },
      providerNames: providerResults.map(p => p.name),
      daily,
    };
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