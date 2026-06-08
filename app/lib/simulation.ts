import { City, World } from '@/app/types/tiles';

const CITY_DAILY_POPULATION_GROWTH = {
  min: 1,
  max: 12,
};

const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const growCityPopulation = (city: City): City => ({
  ...city,
  population:
    city.population +
    getRandomInt(
      CITY_DAILY_POPULATION_GROWTH.min,
      CITY_DAILY_POPULATION_GROWTH.max,
    ),
});

export const updateWorldForNewDay = (world: World): World => ({
  ...world,
  cities: world.cities.map(growCityPopulation),
});

export { CITY_DAILY_POPULATION_GROWTH };
