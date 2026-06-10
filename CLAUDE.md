# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the colony-sim repository.

## Common Commands

- `npm run dev` – Start both WS server (port 3001) and Next.js client (port 3000) via concurrently
- `npm run dev:server` – Start only the WebSocket server with `tsx watch`
- `npm run dev:client` – Start only the Next.js dev server
- `npm run build` – Build the production Next.js application
- `npm run start` – Run the built application in production mode
- `npm run lint` – Execute ESLint to check for code issues

There is currently no test script defined; the project does not include automated tests.

## Project Architecture

### High-Level Structure

**Server (standalone Node.js process, port 3001):**
- `server/index.ts` — Entry point. Starts HTTP server + WebSocket server using `ws`. Exposes REST endpoints:
  - `POST /api/world` — Create a new world (accepts optional `seed`), returns `{ worldId, world }`
  - `GET /api/world/:id` — Get current world state `{ world, day, eventLog }`
  - `GET /health` — Health check
- `server/worldStore.ts` — In-memory `Map<string, WorldEntry>`. Each entry holds world state, day counter, event log, connected clients `Set<WebSocket>`, and tick interval. Provides `createWorldEntry`, `getWorldEntry`, `addClient`, `removeClient`, `broadcast`.
- `server/simulationEngine.ts` — `updateWorldForNewDay(world)`: grows each city's population by random 1–12.
- `server/mapGenerator.ts` — `generateMap(seed)`: procedural 100×100 tile map with simplex noise + Alea PRNG. Places 5–15 cities on grass tiles.
- `server/socketHandler.ts` — Dispatches WS messages: `joinWorld`, `action`, `ping`. Sends `worldState`, `pong`, `error`.

**Client (Next.js App Router, port 3000):**
- `app/page.tsx` — Renders `<WorldView />`.
- `app/layout.tsx` — Root layout; fonts, CSS.
- `app/globals.css` — Tailwind CSS base styles.
- `app/config.ts` — Constants (map size, thresholds, tick interval, etc.).
- `app/types/tiles.ts` — TypeScript definitions: `TileType`, `Tile`, `City`, `World`, `Event`.

**Client components:**
- `WorldView.tsx` — Main orchestrator. On mount: `POST /api/world` to create world, then connects via WebSocket. All state (world, day, event log) comes from server push.
- `MapRenderer.tsx` — Canvas-based tile map with pan/zoom. Receives world via props.
- `DayCounter.tsx` — Displays current day.
- `TileInspector.tsx` — Shows selected tile/city details.
- `EventLog.tsx` — Modal showing event history.

**Client lib:**
- `worldSocket.ts` — WebSocket client with exponential backoff reconnect and heartbeat. Exposes `connect(worldId)`, `disconnect()`, `onMessage(handler)`.

**API routes (proxy to server):**
- `app/api/world/route.ts` — `POST` → proxies to `server/index.ts` to create world
- `app/api/world/[id]/route.ts` — `GET` → proxies to `server/index.ts` to get world state

### WebSocket Protocol

All messages are JSON with a `type` field.

**Client → Server:**

| Type | Payload | Description |
|------|---------|-------------|
| `joinWorld` | `{ worldId }` | Subscribe to world updates |
| `action` | `{ worldId, payload }` | Player actions (future) |
| `ping` | — | Keep-alive |

**Server → Client:**

| Type | Payload | Description |
|------|---------|-------------|
| `worldState` | `{ world, day, eventLog }` | Full world state (sent on join + every tick) |
| `error` | `{ message }` | Error notification |
| `pong` | — | Keep-alive response |

### Data Flow

1. `WorldView` mounts → `POST /api/world` creates world on server → returns `worldId`
2. `WorldView` connects to `ws://localhost:3001` → sends `joinWorld` → server sends initial `worldState`
3. Server ticks every `DAY_TICK_MS` (1000ms): increments day, grows city populations, broadcasts `worldState` to all connected clients
4. Every 10 days, server adds an event to the log
5. Client renders: `MapRenderer` draws canvas, `DayCounter` shows day, `TileInspector` shows selection, `EventLog` shows events
6. UI interactions (map clicks) update local React state only (selected tile/city)

### Architecture Notes

- **Server-authoritative**: The server owns the single source of truth for world state. Clients only render.
- **In-memory only**: Worlds are lost on server restart. No database or persistence layer.
- **Multi-client ready**: `WorldEntry.clients` is a `Set<WebSocket>`, `broadcast()` sends to all connected clients.
- **Reconnect**: Client uses exponential backoff (2s base, 30s max) with max 10 attempts.
- **Strict Mode disabled**: `next.config.ts` has `reactStrictMode: false` to prevent WS double-connect issues in dev.
- **Two separate processes**: WS server (port 3001) and Next.js (port 3000) run independently via `concurrently`.

### Extending the Simulation

- New game mechanics: add handler in `server/socketHandler.ts`, define new WS message types in `server/socketHandler.ts`
- World evolution: edit `server/simulationEngine.ts`
- Map generation: edit `server/mapGenerator.ts`
- New client actions: send WS messages from components via a shared socket ref or context

### Notes

- The project uses Next.js with TypeScript; linting follows `eslint-config-next`.
- CSS Modules scope styles to components; global Tailwind utilities are available.
- `app/lib/mapGenerator.ts` and `app/lib/simulation.ts` are **deleted** — their functionality moved to `server/`.
