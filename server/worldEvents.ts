import { City, CityTrait, Event, World } from '../app/types/tiles';
import {
  EVENT_DAILY_CHANCE,
  HARVEST_FOOD_BONUS_RANGE,
  PLAGUE_POPULATION_LOSS_RATE,
  MIN_CITY_POPULATION,
  TRAIT_EVENT_RESIST,
  FOOD_CONSUMPTION_PER_CAPITA,
  CITY_STATUS_THRESHOLDS,
  CITY_STATUS_COLORS,
} from '../app/config';
import { computeCityStatus } from './simulationEngine';

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const pickRandom = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/**
 * Trait-based event resistance: fortunate cities avoid bad events,
 * doomed cities are more vulnerable.
 */
const eventResistance = (city: City): number =>
  city.traits.reduce((sum, t) => sum + (TRAIT_EVENT_RESIST[t] || 0), 0);

/** Roll against a city's resistance. Returns true if the event is resisted. */
const isResisted = (city: City, baseChance: number): boolean =>
  Math.random() < eventResistance(city) * baseChance;

type EventKind = {
  /** Weight for random selection — higher = more common. */
  weight: number;
  /** Whether this is a negative event (subject to resistance). */
  negative: boolean;
  /** Apply the effect to the chosen city. */
  apply: (city: City, world: World) => { city: City; message: string } | null;
};

const EVENT_KINDS: EventKind[] = [
  // Bountiful harvest
  {
    weight: 3,
    negative: false,
    apply: (city) => {
      if (isResisted(city, 0.3)) return null;
      const bonus = getRandomInt(HARVEST_FOOD_BONUS_RANGE.min, HARVEST_FOOD_BONUS_RANGE.max);
      return {
        city: { ...city, food: city.food + bonus },
        message: `🌾 Bountiful harvest in ${city.name}: +${bonus} food`,
      };
    },
  },
  // Plague
  {
    weight: 2,
    negative: true,
    apply: (city) => {
      if (isResisted(city, 1)) return null;
      const rate = getRandomFloat(PLAGUE_POPULATION_LOSS_RATE.min, PLAGUE_POPULATION_LOSS_RATE.max);
      const lost = Math.ceil(city.population * rate);
      const population = Math.max(MIN_CITY_POPULATION, city.population - lost);
      const actualLost = city.population - population;
      return {
        city: { ...city, population },
        message: `☠️ Plague strikes ${city.name}: -${actualLost} population`,
      };
    },
  },
  // Golden age — a thriving city enters a period of prosperity
  {
    weight: 1,
    negative: false,
    apply: (city) => {
      const ratio = city.food / (city.population * FOOD_CONSUMPTION_PER_CAPITA);
      if (ratio < CITY_STATUS_THRESHOLDS.thriving) return null;
      if (city.traits.includes(CityTrait.DOOMED)) return null;
      const foodBonus = Math.floor(city.population * 0.5);
      const goldBonus = Math.floor(city.population * 0.2);
      const updated: City = {
        ...city,
        food: city.food + foodBonus,
        gold: city.gold + goldBonus,
        status: { state: 'golden_age', color: CITY_STATUS_COLORS.golden_age },
      };
      return {
        city: updated,
        message: `✨ Golden age begins in ${city.name}! +${foodBonus} food, +${goldBonus} gold`,
      };
    },
  },
  // Dark age — a starving city falls into decline
  {
    weight: 1,
    negative: true,
    apply: (city) => {
      const ratio = city.food / (city.population * FOOD_CONSUMPTION_PER_CAPITA);
      if (ratio >= CITY_STATUS_THRESHOLDS.struggling) return null;
      if (city.traits.includes(CityTrait.FORTUNATE) && Math.random() < 0.5) return null;
      const goldLoss = Math.floor(city.gold * 0.2);
      const updated: City = {
        ...city,
        gold: Math.max(0, city.gold - goldLoss),
        status: { state: 'dark_age', color: CITY_STATUS_COLORS.dark_age },
      };
      return {
        city: updated,
        message: `💀 Dark age falls upon ${city.name}: -${goldLoss} gold lost to unrest`,
      };
    },
  },
  // Drought — reduces food in a struggling city
  {
    weight: 1,
    negative: true,
    apply: (city) => {
      if (city.food > city.population * FOOD_CONSUMPTION_PER_CAPITA * 5) return null;
      if (isResisted(city, 0.8)) return null;
      const loss = Math.floor(city.food * 0.3);
      return {
        city: { ...city, food: Math.max(0, city.food - loss) },
        message: `🏜️ Drought hits ${city.name}: -${loss} food`,
      };
    },
  },
  // Good fortune — a fortunate city gets a random bonus
  {
    weight: 1,
    negative: false,
    apply: (city) => {
      if (!city.traits.includes(CityTrait.FORTUNATE)) return null;
      if (Math.random() > 0.3) return null;
      const goldBonus = getRandomInt(20, 80);
      return {
        city: { ...city, gold: city.gold + goldBonus },
        message: `🍀 Good fortune smiles on ${city.name}: +${goldBonus} gold`,
      };
    },
  },
  // Misfortune — a doomed city suffers extra
  {
    weight: 1,
    negative: true,
    apply: (city) => {
      if (!city.traits.includes(CityTrait.DOOMED)) return null;
      if (Math.random() > 0.25) return null;
      const foodLoss = getRandomInt(15, 60);
      return {
        city: { ...city, food: Math.max(0, city.food - foodLoss) },
        message: `🔥 Misfortune strikes ${city.name}: -${foodLoss} food`,
      };
    },
  },
];

/** Weighted random pick from EVENT_KINDS. */
const pickEventKind = (): EventKind => {
  const totalWeight = EVENT_KINDS.reduce((s, k) => s + k.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const kind of EVENT_KINDS) {
    roll -= kind.weight;
    if (roll <= 0) return kind;
  }
  return EVENT_KINDS[0];
};

/**
 * Maybe fire a random world event for the given day.
 */
export const maybeGenerateEvent = (
  world: World,
  day: number,
): { world: World; event: Event } | null => {
  if (world.cities.length === 0) return null;
  if (Math.random() >= EVENT_DAILY_CHANCE) return null;

  // Try up to 5 times to find an event that actually applies.
  for (let attempt = 0; attempt < 5; attempt++) {
    const kind = pickEventKind();
    const targetCity = pickRandom(world.cities);
    const result = kind.apply(targetCity, world);
    if (!result) continue;

    const { city: updatedCity, message } = result;

    // Recompute status after the event.
    const withStatus = { ...updatedCity, status: computeCityStatus(updatedCity) };

    const event: Event = {
      id: `evt-${day}-${getRandomInt(1000, 9999)}`,
      day,
      message,
    };

    return {
      world: {
        ...world,
        cities: world.cities.map((c) => (c.id === withStatus.id ? withStatus : c)),
      },
      event,
    };
  }

  return null;
};
