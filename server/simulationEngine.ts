import { City, CityState, Event, Human, Poi, TileMap, TileType, World } from '../app/types/tiles';
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
  POPULATION_GROWTH_RATE,
  TRAIT_FOOD_BONUS,
  TRAIT_GOLD_BONUS,
  CITY_STATUS_THRESHOLDS,
  CITY_STATUS_COLORS,
} from '../app/config';
import {
  HUNGER_DECREASE_RANGE,
  ENERGY_DECREASE_RANGE,
  FOOD_PER_EAT,
  HUNGER_RESTORE_RANGE,
  ENERGY_RESTORE_REST_RANGE,
  STARVATION_HEALTH_DAMAGE_RANGE,
  EXHAUSTION_HEALTH_DAMAGE_RANGE,
  HEALTH_RECOVERY_RANGE,
  HEALTH_RECOVERY_HUNGER_THRESHOLD,
  HEALTH_RECOVERY_ENERGY_THRESHOLD,
  MOOD_INCREASE_RANGE,
  MOOD_DECREASE_RANGE,
  MOOD_GOOD_THRESHOLD,
  MOOD_BAD_THRESHOLD,
  DEATH_CHANCE,
  DEATH_HEALTH_THRESHOLD,
  DEATH_MOOD_THRESHOLD,
  HUNGER_EATING_THRESHOLD,
  ENERGY_RESTING_THRESHOLD,
  HUMAN_MOVE_CHANCE,
  HUMAN_MOVE_DELTA_RANGE,
  STAT_MIN,
  STAT_MAX,
  GOLDEN_AGE_FOOD_PRODUCTION_MULT,
  GOLDEN_AGE_GOLD_PRODUCTION_MULT,
  DARK_AGE_FOOD_PRODUCTION_PENALTY,
  DARK_AGE_GOLD_PRODUCTION_PENALTY,
  BIRTH_AVG_MOOD_THRESHOLD,
  BIRTH_FOOD_SURPLUS_MULTIPLIER,
} from './config/serverConfig';

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

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
    stateFoodMult += GOLDEN_AGE_FOOD_PRODUCTION_MULT;
    stateGoldMult += GOLDEN_AGE_GOLD_PRODUCTION_MULT;
  }
  if (city.darkAgeDays > 0) {
    stateFoodMult += DARK_AGE_FOOD_PRODUCTION_PENALTY;
    stateGoldMult += DARK_AGE_GOLD_PRODUCTION_PENALTY;
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
  if (avgMood > BIRTH_AVG_MOOD_THRESHOLD && city.food > pop * BIRTH_FOOD_SURPLUS_MULTIPLIER) {
    if (Math.random() < POPULATION_GROWTH_RATE) {
      const newHumans = generateHumansForCity(updated, 1, map);
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

/** If the city's last inhabitant died, creates a ruins Poi and removes the city. */
const handleHumanDeath = (h: Human, updatedWorld: World, events: Event[]): Poi | null => {
  delete updatedWorld.humans[h.id];
  const city = updatedWorld.cities.find((c) => c.id === h.cityId);
  if (city) {
    city.humanIds = city.humanIds.filter((id) => id !== h.id);
    if (city.humanIds.length === 0) {
      // Remove the dead city from the cities array
      updatedWorld.cities = updatedWorld.cities.filter((c) => c.id !== city.id);
      // Create a ruins POI at the city's location
      const ruins: Poi = {
        id: `ruins-${city.id}`,
        kind: 'ruins',
        name: city.name,
        x: city.x,
        y: city.y,
        formerCityId: city.id,
        formerCityName: city.name,
        createdDay: 0, // will be set by the caller (tick day)
      };
      events.push({
        id: `city-ruins-${city.id}-${Date.now()}`,
        day: 0,
        message: `${city.name} превратился в руины`,
        kind: 'city_ruins',
      });
      events.push({
        id: `death-${h.id}-${Date.now()}`,
        day: 0,
        message: `${h.name} умер от истощения`,
        kind: 'human_action',
      });
      return ruins;
    }
  }
  events.push({
    id: `death-${h.id}-${Date.now()}`,
    day: 0,
    message: `${h.name} умер от истощения`,
    kind: 'human_action',
  });
  return null;
};

export const updateWorldForNewDay = (world: World): { world: World; events: Event[] } => {
  const cityResults = world.cities.map((city) => updateCityForNewDay(city, world.map, world));
  const updatedWorld: World = {
    ...world,
    humans: { ...world.humans },
    cities: cityResults.map((r) => r.city),
    pois: [...world.pois],
  };
  const events: Event[] = cityResults.flatMap((r) => r.events);
  const newPois: Poi[] = [];

  // Update humans
  for (const human of Object.values(world.humans)) {
    const h = { ...human };

    // Movement: only if not eating or resting, and only onto grass tiles
    if (human.currentAction !== 'eating' && human.currentAction !== 'resting') {
      if (Math.random() < HUMAN_MOVE_CHANCE) {
        const dx = randInt(HUMAN_MOVE_DELTA_RANGE.min, HUMAN_MOVE_DELTA_RANGE.max);
        const dy = randInt(HUMAN_MOVE_DELTA_RANGE.min, HUMAN_MOVE_DELTA_RANGE.max);
        const newX = clamp(h.x + dx, 0, MAP_WIDTH - 1);
        const newY = clamp(h.y + dy, 0, MAP_HEIGHT - 1);
        // Block movement onto water and mountain tiles
        if (updatedWorld.map[newY][newX].type === TileType.GRASS) {
          h.x = newX;
          h.y = newY;
          h.currentAction = 'moving';
        }
      }
    }

    h.hunger = clamp(h.hunger - randInt(HUNGER_DECREASE_RANGE.min, HUNGER_DECREASE_RANGE.max), STAT_MIN, STAT_MAX);
    h.energy = clamp(h.energy - randInt(ENERGY_DECREASE_RANGE.min, ENERGY_DECREASE_RANGE.max), STAT_MIN, STAT_MAX);

    // Eating: consume food from city to restore hunger
    if (human.currentAction === 'eating') {
      const city = updatedWorld.cities.find((c) => c.id === human.cityId);
      if (city && city.food >= FOOD_PER_EAT) {
        city.food -= FOOD_PER_EAT;
        h.hunger = clamp(h.hunger + randInt(HUNGER_RESTORE_RANGE.min, HUNGER_RESTORE_RANGE.max), STAT_MIN, STAT_MAX);
      }
    }

    // Resting: recover energy
    if (human.currentAction === 'resting') {
      h.energy = clamp(h.energy + randInt(ENERGY_RESTORE_REST_RANGE.min, ENERGY_RESTORE_REST_RANGE.max), STAT_MIN, STAT_MAX);
    }

    // Health update rules based on hunger and energy
    if (h.hunger === 0) h.health -= randInt(STARVATION_HEALTH_DAMAGE_RANGE.min, STARVATION_HEALTH_DAMAGE_RANGE.max);
    if (h.energy === 0) h.health -= randInt(EXHAUSTION_HEALTH_DAMAGE_RANGE.min, EXHAUSTION_HEALTH_DAMAGE_RANGE.max);
    if (h.hunger > HEALTH_RECOVERY_HUNGER_THRESHOLD && h.energy > HEALTH_RECOVERY_ENERGY_THRESHOLD) {
      h.health += randInt(HEALTH_RECOVERY_RANGE.min, HEALTH_RECOVERY_RANGE.max);
    }
    h.health = clamp(h.health, STAT_MIN, STAT_MAX);

    // Mood update rules
    if (h.hunger > MOOD_GOOD_THRESHOLD && h.energy > MOOD_GOOD_THRESHOLD && h.health > MOOD_GOOD_THRESHOLD) {
      h.mood = clamp(h.mood + randInt(MOOD_INCREASE_RANGE.min, MOOD_INCREASE_RANGE.max), STAT_MIN, STAT_MAX);
    } else if (h.hunger < MOOD_BAD_THRESHOLD || h.energy < MOOD_BAD_THRESHOLD || h.health < MOOD_BAD_THRESHOLD) {
      h.mood = clamp(h.mood - randInt(MOOD_DECREASE_RANGE.min, MOOD_DECREASE_RANGE.max), STAT_MIN, STAT_MAX);
    }

    // Death chance mechanic for critically low stats
    if (h.health < DEATH_HEALTH_THRESHOLD && h.mood < DEATH_MOOD_THRESHOLD) {
      if (Math.random() < DEATH_CHANCE) {
        const poi = handleHumanDeath(h, updatedWorld, events);
        if (poi) newPois.push(poi);
        continue;
      }
    }

    // Task 5.2: Death handling when health reaches 0
    if (h.health <= 0) {
      const poi = handleHumanDeath(h, updatedWorld, events);
      if (poi) newPois.push(poi);
      continue;
    }

    if (h.hunger < HUNGER_EATING_THRESHOLD) h.currentAction = 'eating';
    else if (h.energy < ENERGY_RESTING_THRESHOLD) h.currentAction = 'resting';
    else h.currentAction = 'idle';
    updatedWorld.humans[h.id] = h;
  }

  updatedWorld.pois = [...updatedWorld.pois, ...newPois];

  return { world: updatedWorld, events };
};
