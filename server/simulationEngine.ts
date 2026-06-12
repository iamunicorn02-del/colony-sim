import { City, CityState, Event, Human, TileMap, TileType, World } from '../app/types/tiles';
import { generateHumansForCity } from './humanGenerator';
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

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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

const updateCityForNewDay = (city: City, map: TileMap, world: World): { city: City; events: Event[] } => {
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

  // Task 7.1: Calculate average mood of city residents
  const events: Event[] = [];
  const pop = getPopulation(city);
  let avgMood = 0;
  if (pop > 0) {
    let totalMood = 0;
    for (const humanId of city.humanIds) {
      const human = world.humans[humanId];
      if (human) totalMood += human.mood;
    }
    avgMood = totalMood / pop;
  }

  // Task 7.2 & 7.3: Check birth conditions and generate new human
  if (avgMood > 70 && city.food > pop * 2) {
    if (Math.random() < POPULATION_GROWTH_RATE) {
      const newHumans = generateHumansForCity(updated, 1);
      for (const newHuman of newHumans) {
        // Ensure unique ID by appending timestamp
        newHuman.id = `human-${city.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        updated.humanIds = [...updated.humanIds, newHuman.id];
        // Store human in world (will be picked up by the caller)
        world.humans[newHuman.id] = newHuman;
      }
      events.push({
        id: `birth-${city.id}-${Date.now()}`,
        day: 0,
        message: `Новый житель родился в ${city.name}`,
        kind: 'birth',
      });
    }
  }

  return { city: updated, events };
};

const DEATH_CHANCE = 0.3;
const POPULATION_GROWTH_RATE = 0.02;

const handleHumanDeath = (h: Human, updatedWorld: World, events: Event[]): void => {
  delete updatedWorld.humans[h.id];
  const city = updatedWorld.cities.find((c) => c.id === h.cityId);
  if (city) {
    city.humanIds = city.humanIds.filter((id) => id !== h.id);
    // Task 7.4: City destruction when last human dies
    if (city.humanIds.length === 0) {
      events.push({
        id: `city-ruins-${city.id}-${Date.now()}`,
        day: 0,
        message: `${city.name} превратился в руины`,
        kind: 'city_ruins',
      });
    }
  }
  events.push({
    id: `death-${h.id}-${Date.now()}`,
    day: 0,
    message: `${h.name} умер от истощения`,
    kind: 'human_action',
  });
};

export const updateWorldForNewDay = (world: World): { world: World; events: Event[] } => {
  const cityResults = world.cities.map((city) => updateCityForNewDay(city, world.map, world));
  const updatedWorld: World = {
    ...world,
    humans: { ...world.humans },
    cities: cityResults.map((r) => r.city),
  };
  const events: Event[] = cityResults.flatMap((r) => r.events);

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

    h.hunger = Math.max(0, h.hunger - randInt(5, 10));
    h.energy = Math.max(0, h.energy - randInt(3, 7));

    // Eating: consume food from city to restore hunger
    if (human.currentAction === 'eating') {
      const city = updatedWorld.cities.find((c) => c.id === human.cityId);
      if (city && city.food >= 1) {
        city.food -= 1;
        h.hunger = Math.min(100, h.hunger + randInt(50, 70));
      }
    }

    // Resting: recover energy
    if (human.currentAction === 'resting') {
      h.energy = Math.min(100, h.energy + randInt(15, 25));
    }

    // Task 5.1: Health update rules based on hunger and energy
    if (h.hunger === 0) h.health -= randInt(5, 10);
    if (h.energy === 0) h.health -= randInt(3, 7);
    if (h.hunger > 50 && h.energy > 50) h.health += randInt(2, 5);
    h.health = Math.max(0, Math.min(100, h.health));

    // Task 6: Mood update rules
    if (h.hunger > 70 && h.energy > 70 && h.health > 70) {
      h.mood = Math.min(100, h.mood + randInt(5, 10));
    } else if (h.hunger < 30 || h.energy < 30 || h.health < 30) {
      h.mood = Math.max(0, h.mood - randInt(5, 10));
    }

    // Task 5.3: Death chance mechanic for critically low stats
    if (h.health < 3 && h.mood < 5) {
      if (Math.random() < DEATH_CHANCE) {
        handleHumanDeath(h, updatedWorld, events);
        continue;
      }
    }

    // Task 5.2: Death handling when health reaches 0
    if (h.health <= 0) {
      handleHumanDeath(h, updatedWorld, events);
      continue;
    }

    if (h.hunger < 25) h.currentAction = 'eating';
    else if (h.energy < 20) h.currentAction = 'resting';
    else h.currentAction = 'idle';
    updatedWorld.humans[h.id] = h;
  }

  return { world: updatedWorld, events };
};
