import { City, TileMap, TileType, World } from '../app/types/tiles';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  CITY_HARVEST_RADIUS,
  FOOD_PER_GRASS_TILE,
  FOOD_PER_WATER_TILE,
  FOOD_PER_MOUNTAIN_TILE,
  FOOD_CONSUMPTION_PER_CAPITA,
  FOOD_STORAGE_PER_CAPITA,
  GOLD_TAX_PER_CAPITA,
  POPULATION_GROWTH_RATE,
  POPULATION_STARVATION_RATE,
  MIN_CITY_POPULATION,
} from '../app/config';

const FOOD_PER_TILE: Record<TileType, number> = {
  [TileType.GRASS]: FOOD_PER_GRASS_TILE,
  [TileType.WATER]: FOOD_PER_WATER_TILE,
  [TileType.MOUNTAIN]: FOOD_PER_MOUNTAIN_TILE,
};

/**
 * Sum the food output of every tile within the harvest radius of a city.
 * Grass is farmland, water is fishing, mountains are barren. This gives each
 * city a terrain-driven food production rate (and therefore carrying capacity).
 */
const computeFoodProduction = (city: City, map: TileMap): number => {
  let production = 0;

  for (let dy = -CITY_HARVEST_RADIUS; dy <= CITY_HARVEST_RADIUS; dy++) {
    for (let dx = -CITY_HARVEST_RADIUS; dx <= CITY_HARVEST_RADIUS; dx++) {
      const x = city.x + dx;
      const y = city.y + dy;

      if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) continue;

      production += FOOD_PER_TILE[map[y][x].type];
    }
  }

  return production;
};

const updateCityForNewDay = (city: City, map: TileMap): City => {
  // --- Food ---
  const production = computeFoodProduction(city, map);
  const consumption = city.population * FOOD_CONSUMPTION_PER_CAPITA;
  const netFood = production - consumption;

  const storageCap = city.population * FOOD_STORAGE_PER_CAPITA;
  const food = Math.max(0, Math.min(storageCap, city.food + netFood));

  // --- Population ---
  // Surplus food + room in the granary grows the city; an empty granary while
  // running a deficit starves it.
  let population = city.population;
  if (netFood > 0) {
    population += Math.ceil(city.population * POPULATION_GROWTH_RATE);
  } else if (city.food <= 0) {
    population -= Math.ceil(city.population * POPULATION_STARVATION_RATE);
  }
  population = Math.max(MIN_CITY_POPULATION, population);

  // --- Gold ---
  const gold = city.gold + population * GOLD_TAX_PER_CAPITA;

  return {
    ...city,
    population,
    food: Math.round(food),
    gold: Math.round(gold),
  };
};

export const updateWorldForNewDay = (world: World): World => {
  return {
    ...world,
    cities: world.cities.map((city) => updateCityForNewDay(city, world.map)),
  };
};
