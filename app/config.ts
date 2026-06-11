import { CityTrait, TileType } from './types/tiles';

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
export const CITY_INITIAL_FOOD_RANGE = { min: 100, max: 400 };
export const CITY_INITIAL_GOLD_RANGE = { min: 50, max: 200 };

// --- Simulation ---
export const DAY_TICK_MS = 1000;
export const MAX_EVENT_LOG_SIZE = 20;
export const DEFAULT_MAP_SEED = 42;

// --- World Events ---
// Chance (per day) that some random world event fires at all.
export const EVENT_DAILY_CHANCE = 0.15;

// Bountiful harvest: a city's granary gets a sudden surplus.
export const HARVEST_FOOD_BONUS_RANGE = { min: 80, max: 250 };

// Plague: a city loses a fraction of its population.
export const PLAGUE_POPULATION_LOSS_RATE = { min: 0.1, max: 0.3 };

// --- Economy ---
// Radius (in tiles) of the area a city harvests food from.
export const CITY_HARVEST_RADIUS = 3;
// Food produced per tile type within the harvest radius, per day.
export const FOOD_PER_GRASS_TILE = 0.35;
export const FOOD_PER_WATER_TILE = 0.15;
export const FOOD_PER_MOUNTAIN_TILE = 0;
// Each citizen eats this much food per day.
export const FOOD_CONSUMPTION_PER_CAPITA = 0.08;
// Max food a city granary can hold per citizen (carrying capacity buffer).
export const FOOD_STORAGE_PER_CAPITA = 8;

// Gold collected as tax per citizen per day.
export const GOLD_TAX_PER_CAPITA = 0.02;

// Population dynamics driven by the food balance.
// Fraction of citizens added per day when there is a food surplus.
export const POPULATION_GROWTH_RATE = 0.02;
// Fraction of citizens lost per day when the granary is empty (starvation).
export const POPULATION_STARVATION_RATE = 0.05;
// A city can never drop below this many citizens.
export const MIN_CITY_POPULATION = 1;

// --- Trade ---
// Max distance (in tiles) between two cities for them to trade.
export const TRADE_RADIUS = 15;
// Fraction of food surplus a seller is willing to offer per trade.
export const TRADE_SURPLUS_FRACTION = 0.1;
// Gold the buyer pays per unit of food.
export const TRADE_PRICE_PER_FOOD = 5;
// Max number of trade events logged per tick (to avoid spamming the log).
export const MAX_TRADE_EVENTS_PER_TICK = 3;

// --- City Traits ---
// How many traits a city gets at founding (randomly picked from the pool).
export const CITY_TRAIT_COUNT = { min: 2, max: 3 };
// All available traits — mapGenerator picks from this list.
export const CITY_TRAIT_POOL: CityTrait[] = [
  CityTrait.WARLIKE,
  CityTrait.TRADER,
  CityTrait.AGRICULTURAL,
  CityTrait.FORTUNATE,
  CityTrait.DOOMED,
  CityTrait.EXPANSIONIST,
  CityTrait.ISOLATED,
];
// Per-trait multipliers applied in the simulation.
export const TRAIT_FOOD_BONUS: Record<CityTrait, number> = {
  [CityTrait.WARLIKE]: 0,
  [CityTrait.TRADER]: 0,
  [CityTrait.AGRICULTURAL]: 0.25,
  [CityTrait.FORTUNATE]: 0,
  [CityTrait.DOOMED]: -0.1,
  [CityTrait.EXPANSIONIST]: 0,
  [CityTrait.ISOLATED]: 0,
};
export const TRAIT_GOLD_BONUS: Record<CityTrait, number> = {
  [CityTrait.WARLIKE]: 0,
  [CityTrait.TRADER]: 0.3,
  [CityTrait.AGRICULTURAL]: 0,
  [CityTrait.FORTUNATE]: 0.1,
  [CityTrait.DOOMED]: 0,
  [CityTrait.EXPANSIONIST]: 0,
  [CityTrait.ISOLATED]: 0,
};
export const TRAIT_EVENT_RESIST: Record<CityTrait, number> = {
  [CityTrait.WARLIKE]: 0,
  [CityTrait.TRADER]: 0,
  [CityTrait.AGRICULTURAL]: 0,
  [CityTrait.FORTUNATE]: 0.3,
  [CityTrait.DOOMED]: -0.2,
  [CityTrait.EXPANSIONIST]: 0,
  [CityTrait.ISOLATED]: 0.15,
};
// City status thresholds (multiples of food-per-capita).
export const CITY_STATUS_THRESHOLDS = {
  starving: 0.5,       // food < pop * consumption * 0.5
  struggling: 2,       // food < pop * consumption * 2
  stable: 5,           // food < pop * consumption * 5
  thriving: 10,        // food < pop * consumption * 10
  // >= thriving => golden_age candidate
};
// Status → marker color (used by MapRenderer).
export const CITY_STATUS_COLORS: Record<string, string> = {
  starving: '#dc2626',     // red
  struggling: '#f59e0b',   // amber
  stable: '#facc15',       // yellow
  thriving: '#22c55e',     // green
  golden_age: '#eab308',   // gold
  dark_age: '#6b7280',     // grey
};
// Marker radius range (px), mapped against population.
export const CITY_MARKER_RADIUS_MIN = 4;
export const CITY_MARKER_RADIUS_MAX = 14;
// Population that maps to max radius.
export const CITY_MARKER_MAX_POP = 2000;

// --- Rendering ---
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 4;
export const KEYBOARD_PAN_DISTANCE = 48;
export const DRAG_CLICK_THRESHOLD = 4;
export const CITY_MARKER_RADIUS = 6;
export const CITY_LABEL_FONT = '600 11px sans-serif';
export const CITY_LABEL_COLOR = '#fdf6e3';
export const CITY_LABEL_OUTLINE_COLOR = '#1b1302';
export const CITY_LABEL_OUTLINE_WIDTH = 3;
// Gap (px) between the marker and the label baseline above it.
export const CITY_LABEL_OFFSET_Y = 4;

export const TILE_COLORS: Record<TileType, string> = {
  [TileType.GRASS]: '#4a9d6f',
  [TileType.WATER]: '#2563eb',
  [TileType.MOUNTAIN]: '#8B5E3C',
};
