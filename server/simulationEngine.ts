import { World } from '../app/types/tiles';
import { CITY_DAILY_POPULATION_GROWTH } from '../app/config';

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const updateWorldForNewDay = (world: World): World => {
  return {
    ...world,
    cities: world.cities.map((city) => ({
      ...city,
      population:
        city.population +
        getRandomInt(
          CITY_DAILY_POPULATION_GROWTH.min,
          CITY_DAILY_POPULATION_GROWTH.max
        ),
    })),
  };
};
