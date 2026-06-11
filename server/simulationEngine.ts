import { City, CityState, TileMap, TileType, World } from '../app/types/tiles';
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
  TRAIT_FOOD_BONUS,
  TRAIT_GOLD_BONUS,
  CITY_STATUS_THRESHOLDS,
  CITY_STATUS_COLORS,
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

export const computeCityStatus = (city: City): City['status'] => {
  // Golden age / dark age are transient event states that override
  // the food-based status while their timers are active.
  if (city.goldenAgeDays > 0) {
    return { state: 'golden_age', color: CITY_STATUS_COLORS.golden_age };
  }
  if (city.darkAgeDays > 0) {
    return { state: 'dark_age', color: CITY_STATUS_COLORS.dark_age };
  }

  const ratio = city.population > 0
    ? city.food / (city.population * FOOD_CONSUMPTION_PER_CAPITA)
    : 0;
  let state: CityState;
  if (ratio < CITY_STATUS_THRESHOLDS.starving) state = 'starving';
  else if (ratio < CITY_STATUS_THRESHOLDS.struggling) state = 'struggling';
  else if (ratio < CITY_STATUS_THRESHOLDS.stable) state = 'stable';
  else state = 'thriving';
  return { state, color: CITY_STATUS_COLORS[state] || '#facc15' };
};

const updateCityForNewDay = (city: City, map: TileMap): City => {
  // --- Trait bonuses ---
  const foodBonus = city.traits.reduce(
    (sum, t) => sum + (TRAIT_FOOD_BONUS[t] || 0), 0,
  );
  const goldBonus = city.traits.reduce(
    (sum, t) => sum + (TRAIT_GOLD_BONUS[t] || 0), 0,
  );

  // --- Special state multipliers ---
  let stateFoodMult = 1;
  let stateGoldMult = 1;
  if (city.goldenAgeDays > 0) {
    stateFoodMult += 0.2;
    stateGoldMult += 0.15;
  }
  if (city.darkAgeDays > 0) {
    stateFoodMult -= 0.15;
    stateGoldMult -= 0.2;
  }

  // --- Food ---
  const production = computeFoodProduction(city, map) * (1 + foodBonus) * stateFoodMult;
  const consumption = city.population * FOOD_CONSUMPTION_PER_CAPITA;
  const netFood = production - consumption;

  const storageCap = city.population * FOOD_STORAGE_PER_CAPITA;
  const food = Math.max(0, Math.min(storageCap, city.food + netFood));

  // --- Population ---
  let population = city.population;
  if (netFood > 0) {
    population += Math.ceil(city.population * POPULATION_GROWTH_RATE);
  } else if (city.food <= 0) {
    population -= Math.ceil(city.population * POPULATION_STARVATION_RATE);
  }

  // Epidemic: extra population loss
  if (city.epidemicDays > 0) {
    const loss = Math.ceil(city.population * 0.03);
    population -= loss;
  }

  population = Math.max(MIN_CITY_POPULATION, population);

  // --- Gold ---
  const gold = city.gold + population * GOLD_TAX_PER_CAPITA * (1 + goldBonus) * stateGoldMult;

  // --- Decrement temporary state timers ---
  const goldenAgeDays = Math.max(0, city.goldenAgeDays - 1);
  const darkAgeDays = Math.max(0, city.darkAgeDays - 1);
  const epidemicDays = Math.max(0, city.epidemicDays - 1);

  const updated: City = {
    ...city,
    population,
    food: Math.round(food),
    gold: Math.round(gold),
    goldenAgeDays,
    darkAgeDays,
    epidemicDays,
  };
  updated.status = computeCityStatus(updated);
  return updated;
};

export const updateWorldForNewDay = (world: World): World => {
  return {
    ...world,
    cities: world.cities.map((city) => updateCityForNewDay(city, world.map)),
  };
};
