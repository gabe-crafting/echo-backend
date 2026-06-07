// Central place for environment-driven config.
// Bun auto-loads a .env file in the project root, so process.env is populated.
export const config = {
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',
};
