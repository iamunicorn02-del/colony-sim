<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Instructions for colony-sim

## Architecture

Two-process architecture:
- **WebSocket server** (`server/index.ts`, port 3001): Owns all world state, simulation logic, and REST API
- **Next.js client** (`app/`, port 3000): Renders UI, receives state via WebSocket push

## Key Commands

```bash
npm run dev          # Start both server + client via concurrently
npm run dev:server   # Start only WS server (tsx watch)
npm run dev:client   # Start only Next.js dev server
npm run build        # Build production Next.js
npm run lint         # ESLint (eslint-config-next)
```

No test suite exists.

## Critical Quirks

- `reactStrictMode: false` in `next.config.ts` — required to prevent WebSocket double-connect in dev
- Server binds WS on port 3001, client auto-derives WS URL from `window.location.hostname:3001`
- Worlds are in-memory only (lost on server restart)
- Server seeds a demo world on startup (seed 42)

## WebSocket Protocol

Client sends: `joinWorld`, `action`, `ping`
Server sends: `worldState` (full state on join + every tick), `event`, `error`, `pong`

## Where to Make Changes

- Game mechanics: `server/simulationEngine.ts`
- Map generation: `server/mapGenerator.ts`
- WS message handling: `server/socketHandler.ts`
- Trade system: `server/trading.ts`
- World events: `server/worldEvents.ts`
- Client UI components: `app/components/`
- Simulation constants: `app/config.ts`
- Type definitions: `app/types/tiles.ts`
