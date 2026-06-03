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

## Key Concepts
- **Providers are dumb** — only fetch and map data
- **Service is smart** — fan-out via `Promise.allSettled`, combine results
- **Functional design** — no classes, pure functions where possible
- **Extensible** — new provider = add to `providers/index.ts`, nothing else changes
- **Fault-tolerant** — one provider failing doesn't break the response
