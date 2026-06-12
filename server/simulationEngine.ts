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

/** Population is now derived from humanIds.length. */
const getPopulation = (city: City): number => city.humanIds.length;

export const computeCityStatus = (city: City): City['status'] => {
  if (city.goldenAgeDays > 0) {
    return { state: 'golden_age', color: CITY_STATUS_COLORS.golden_age };
  }
  if (city.darkAgeDays > 0) {
    return { state: 'dark_age', color: CITY_STATUS_COLORS.dark_age };
  }

  const pop = getPopulation(city);
  const ratio = pop > 0
    ? city.food / (pop * FOOD_CONSUMPTION_PER_CAPITA)
    : 0;
  let state: CityState;
  if (ratio < CITY_STATUS_THRESHOLDS.starving) state = 'starving';
  else if (ratio < CITY_STATUS_THRESHOLDS.struggling) state = 'struggling';
  else if (ratio < CITY_STATUS_THRESHOLDS.stable) state = 'stable';
  else state = 'thriving';
  return { state, color: CITY_STATUS_COLORS[state] || '#facc15' };
};

const updateCityForNewDay = (city: City, map: TileMap): City => {
  const foodBonus = city.traits.reduce(
    (sum, t) => sum + (TRAIT_FOOD_BONUS[t] || 0), 0,
  );
  const goldBonus = city.traits.reduce(
    (sum, t) => sum + (TRAIT_GOLD_BONUS[t] || 0), 0,
  );

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

  const production = computeFoodProduction(city, map) * (1 + foodBonus) * stateFoodMult;
  const consumption = getPopulation(city) * FOOD_CONSUMPTION_PER_CAPITA;
  const netFood = production - consumption;

  const storageCap = getPopulation(city) * FOOD_STORAGE_PER_CAPITA;
  const food = Math.max(0, Math.min(storageCap, city.food + netFood));

  const gold = city.gold + getPopulation(city) * GOLD_TAX_PER_CAPITA * (1 + goldBonus) * stateGoldMult;

  const goldenAgeDays = Math.max(0, city.goldenAgeDays - 1);
  const darkAgeDays = Math.max(0, city.darkAgeDays - 1);
  const epidemicDays = Math.max(0, city.epidemicDays - 1);

  const updated: City = {
    ...city,
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
  const updatedWorld: World = {
    ...world,
    cities: world.cities.map((city) => updateCityForNewDay(city, world.map)),
  };

  // Update humans
  for (const human of Object.values(world.humans)) {
    const h = { ...human };

    // Movement: only if not eating or resting, 30% chance to move
    if (human.currentAction !== 'eating' && human.currentAction !== 'resting') {
      if (Math.random() < 0.3) {
        const dx = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const dy = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        h.x = Math.max(0, Math.min(99, h.x + dx));
        h.y = Math.max(0, Math.min(99, h.y + dy));
        h.currentAction = 'moving';
      }
    }

    h.hunger = Math.max(0, h.hunger - (Math.floor(Math.random() * 6) + 5));
    h.energy = Math.max(0, h.energy - (Math.floor(Math.random() * 5) + 3));
    if (h.hunger < 20) h.currentAction = 'eating';
    else if (h.energy < 20) h.currentAction = 'resting';
    else h.currentAction = 'idle';
    updatedWorld.humans[h.id] = h;
  }

  return updatedWorld;
};
