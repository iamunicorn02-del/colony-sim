import { City, World } from '@/app/types/tiles';
import { CITY_DAILY_POPULATION_GROWTH } from '../config';

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

export const updateWorldForNewDay = (world: World): World => {
    if (true) {}

    return {...world, 
        cities: world.cities.map(growCityPopulation)
    }
}
// : World => ({
//   ...world,
//   cities: world.cities.map(growCityPopulation),
// });

