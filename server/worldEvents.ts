import { City, Event, World } from '../app/types/tiles';
import {
  EVENT_DAILY_CHANCE,
  HARVEST_FOOD_BONUS_RANGE,
  PLAGUE_POPULATION_LOSS_RATE,
  MIN_CITY_POPULATION,
} from '../app/config';

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomFloat = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

type EventKind = {
  /** Apply the effect to the chosen city, returning the updated city and a log message. */
  apply: (city: City) => { city: City; message: string };
};

const EVENT_KINDS: EventKind[] = [
  // Bountiful harvest — a sudden surplus fills the city's granary.
  {
    apply: (city) => {
      const bonus = getRandomInt(HARVEST_FOOD_BONUS_RANGE.min, HARVEST_FOOD_BONUS_RANGE.max);
      return {
        city: { ...city, food: city.food + bonus },
        message: `Bountiful harvest in ${city.name}: +${bonus} food`,
      };
    },
  },
  // Plague — disease wipes out a fraction of the population.
  {
    apply: (city) => {
      const rate = getRandomFloat(
        PLAGUE_POPULATION_LOSS_RATE.min,
        PLAGUE_POPULATION_LOSS_RATE.max
      );
      const lost = Math.ceil(city.population * rate);
      const population = Math.max(MIN_CITY_POPULATION, city.population - lost);
      const actualLost = city.population - population;
      return {
        city: { ...city, population },
        message: `Plague strikes ${city.name}: -${actualLost} population`,
      };
    },
  },
];

/**
 * Maybe fire a random world event for the given day. Returns the (possibly
 * mutated) world and an event to log, or null if nothing happened.
 */
export const maybeGenerateEvent = (
  world: World,
  day: number
): { world: World; event: Event } | null => {
  if (world.cities.length === 0) return null;
  if (Math.random() >= EVENT_DAILY_CHANCE) return null;

  const kind = pickRandom(EVENT_KINDS);
  const targetCity = pickRandom(world.cities);
  const { city: updatedCity, message } = kind.apply(targetCity);

  const event: Event = {
    id: `evt-${day}-${getRandomInt(1000, 9999)}`,
    day,
    message,
  };

  return {
    world: {
      ...world,
      cities: world.cities.map((c) => (c.id === updatedCity.id ? updatedCity : c)),
    },
    event,
  };
};
