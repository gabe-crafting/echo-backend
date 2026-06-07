import { Elysia, t } from 'elysia';
import { weatherController } from '../controllers/weather.controller';

export const weatherRoutes = new Elysia({ prefix: '/weather' })
  .get(
    '/',
    async ({ query }) => {
      return weatherController.getCurrent(query.lat, query.lon);
    },
    {
      query: t.Object({
        lat: t.Number({ description: 'Latitude' }),
        lon: t.Number({ description: 'Longitude' })
      })
    }
  )
  .get(
    '/history',
    async ({ query }) => {
      return weatherController.getHistory(query.lat, query.lon, query.start, query.end);
    },
    {
      query: t.Object({
        lat: t.Number({ description: 'Latitude' }),
        lon: t.Number({ description: 'Longitude' }),
        start: t.String({ description: 'Start date, YYYY-MM-DD' }),
        end: t.String({ description: 'End date, YYYY-MM-DD' })
      })
    }
  )
  .get(
    '/readings',
    async ({ query }) => {
      return weatherController.getReadings(query.lat, query.lon, query.start, query.end);
    },
    {
      query: t.Object({
        lat: t.Number({ description: 'Latitude' }),
        lon: t.Number({ description: 'Longitude' }),
        start: t.String({ description: 'Start date, YYYY-MM-DD' }),
        end: t.String({ description: 'End date, YYYY-MM-DD' })
      })
    }
  );
