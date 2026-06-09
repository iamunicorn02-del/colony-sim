# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- `npm run dev` – Start the development server at http://localhost:3000
- `npm run build` – Build the production Next.js application
- `npm run start` – Run the built application in production mode
- `npm run lint` – Execute ESLint to check for code issues

There is currently no test script defined; the project does not include automated tests.

## Project Architecture

### High-Level Structure
- **`app/`** – Next.js 13+ app router directory.
  - `page.tsx` – Entry point; renders `<WorldView />`.
  - `layout.tsx` – Root layout; provides global fonts, CSS, and metadata.
  - `globals.css` – Tailwind CSS base styles.
  - `components/` – Reusable UI components used by `WorldView`:
    - `WorldView.tsx` – Main simulation view: handles day ticking, world state updates, event logging, and subcomponents.
    - `MapRenderer.tsx` – Renders the tile map using provincial data from `generateMap`.
    - `DayCounter.tsx` – Displays the current simulation day.
    - `TileInspector.tsx` – Shows details of the selected tile or city.
    - `EventLog.tsx` – Modal popup that lists simulation events (e.g., "passed 10 days").
  - `lib/` – Utility functions:
    - `mapGenerator.ts` – Procedural map generation (tiles, cities).
    - `simulation.ts` – Daily world update logic (city population growth).
- **`app/types/tiles.ts`** – TypeScript definitions:
  - `TileType` enum (water, grass).
  - `Tile`, `City`, `World`, `Event` interfaces.
- **Styling** – Uses Tailwind CSS via `globals.css`; component-specific styles in `.module.css` files (CSS Modules).

### Data Flow
1. `WorldView` initializes the world via `generateMap(42)` (seed).
2. A `setInterval` ticks each day (`DAY_TICK_MS = 1000` ms):
   - Increments the day counter.
   - Calls `updateWorldForNewDay` to grow city populations.
   - Every 10 days, pushes an event into `eventLog` state.
3. The world (`{ map, cities }`) is passed down as props to:
   - `MapRenderer` – draws each tile.
   - `TileInspector` – shows info about selected tile/city (via state set by map click handlers).
   - `EventLog` – displays accumulated events.
4. UI interactions (button clicks, map clicks) update local state in `WorldView` (selected city/tile, event log visibility).

### Extending the Simulation
- To add new event types, push objects conforming to `{ id: string, day: number, message: string }` into `eventLog` via `setEventLog`.
- To modify world evolution, edit `updateWorldForNewDay` in `lib/simulation.ts`.
- To change map generation, adjust `generateMap` in `lib/mapGenerator.ts`.

### Notes
- The project uses Next.js with TypeScript; linting follows `eslint-config-next`.
- CSS Modules scope styles to components; global Tailwind utilities are available.
- No database or persistence; simulation resets on page reload.