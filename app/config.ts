import { TileType } from './types/tiles';

// --- Map Generation ---
export const MAP_WIDTH = 100;
export const MAP_HEIGHT = 100;
export const NOISE_SCALE = 0.1;

export const TILE_THRESHOLD_WATER = 0.35;
export const TILE_THRESHOLD_GRASS = 0.75; // mountain when > 0.75

// --- Cities ---
export const CITY_COUNT_RANGE = { min: 5, max: 15 };
export const MIN_CITY_DISTANCE = 10;
export const MAX_CITY_PLACEMENT_ATTEMPTS = 5000;

export const CITY_NAME_PARTS = [
  'Green',
  'River',
  'Stone',
  'Oak',
  'Lake',
  'Hill',
  'Sun',
  'North',
  'Meadow',
  'Ash',
];

export const CITY_NAME_SUFFIXES = [
  'ford',
  'haven',
  'watch',
  'field',
  'bridge',
  'rest',
  'fall',
  'point',
  'stead',
  'vale',
];

export const CITY_INITIAL_POPULATION_RANGE = { min: 60, max: 450 };

// --- Simulation ---
export const DAY_TICK_MS = 1000;
export const EVENT_INTERVAL_DAYS = 10;
export const MAX_EVENT_LOG_SIZE = 20;
export const DEFAULT_MAP_SEED = 42;

export const CITY_DAILY_POPULATION_GROWTH = {
  min: 1,
  max: 12,
};

// --- Rendering ---
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;
export const KEYBOARD_PAN_DISTANCE = 48;
export const DRAG_CLICK_THRESHOLD = 4;
export const CITY_MARKER_RADIUS = 6;

export const TILE_COLORS: Record<TileType, string> = {
  [TileType.GRASS]: '#4a9d6f',
  [TileType.WATER]: '#2563eb',
  [TileType.MOUNTAIN]: '#8B5E3C',
};
