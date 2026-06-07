# Multi-Weather Aggregator – Architecture

## Stack
- **Runtime:** Bun
- **Framework:** Elysia  
- **Style:** Functional + TypeScript

## Folder Structure
```
src/
├── providers/      # Weather API adapters
├── services/       # Business logic
├── controllers/    # HTTP handlers
├── routes/         # Route definitions
├── types/          # Interfaces
├── utils/          # Helpers (wmo code mapping, etc.)
└── index.ts        # Entry point
```

## Layers
| Layer | Role |
|---|---|
| Routes | Define endpoints |
| Controllers | Parse input, call service |
| Services | Orchestration + aggregation |
| Providers | Fetch & normalize from each API |
| Types | Shared interfaces |
| Utils | Shared pure helpers |

## Endpoints
| Method | Endpoint | Returns |
|---|---|---|
| GET | `/weather?lat&lon` | Current weather per source |
| GET | `/weather/history?lat&lon&start&end` | Hourly history per source |

## Providers
Each provider implements only the capabilities its API supports (`fetchCurrent`, `fetchHistory`). The service filters by capability before each fan-out.

| Provider | API | Auth | Role |
|---|---|---|---|
| Open-Meteo | `api.open-meteo.com` | None | Current weather |
| MET Norway | `api.met.no` | User-Agent header | Current weather (strong EU coverage) |
| ERA5 | `archive-api.open-meteo.com` | None | Historical reanalysis (~5-day lag) |

> ERA5 = ECMWF reanalysis dataset, served as JSON by Open-Meteo's archive host. History-only.

## Key Concepts
- **Providers are dumb** — only fetch and map data
- **Service is smart** — fan-out via `Promise.allSettled`, combine results
- **Functional design** — no classes, pure functions where possible
- **Extensible** — new provider = add to `providers/index.ts`, nothing else changes
- **Fault-tolerant** — one provider failing doesn't break the response
