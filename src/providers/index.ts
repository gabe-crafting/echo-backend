import { openMeteoProvider } from "./open-meteo"
import { metNorwayProvider } from "./met-norway"
import { era5Provider } from "./era5"
import { openWeatherProvider } from "./openweather"

export const providers = [openMeteoProvider, metNorwayProvider, era5Provider, openWeatherProvider]