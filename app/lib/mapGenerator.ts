import { City, TileType, Tile, TileMap, World } from '@/app/types/tiles';
import { createNoise2D } from "simplex-noise"
import Alea from 'alea';

const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const SCALE = 0.1;
const CITY_COUNT_RANGE = {
  min: 5,
  max: 15,
};
const MIN_CITY_DISTANCE = 10;
const MAX_CITY_PLACEMENT_ATTEMPTS = 5000;
const CITY_NAME_PARTS = [
  'Green',
  'River',
  'Stone',
  'Oak',
  'Lake',
  'Hill',
  'Sun',
  'North',
  'Meadow',
  'Ash',
];
const CITY_NAME_SUFFIXES = [
  'ford',
  'haven',
  'watch',
  'field',
  'bridge',
  'rest',
  'fall',
  'point',
  'stead',
  'vale',
];

const getRandomInt = (random: () => number, min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

const isFarEnoughFromCities = (x: number, y: number, cities: City[]) => {
  const minDistanceSquared = MIN_CITY_DISTANCE * MIN_CITY_DISTANCE;

  return cities.every((city) => {
    const dx = city.x - x;
    const dy = city.y - y;

    return dx * dx + dy * dy >= minDistanceSquared;
  });
};

const createCityName = (random: () => number) => {
  const prefix = CITY_NAME_PARTS[getRandomInt(random, 0, CITY_NAME_PARTS.length - 1)];
  const suffix = CITY_NAME_SUFFIXES[getRandomInt(random, 0, CITY_NAME_SUFFIXES.length - 1)];

  return `${prefix}${suffix}`;
};

const generateCities = (map: TileMap, random: () => number): City[] => {
  const cityCount = getRandomInt(random, CITY_COUNT_RANGE.min, CITY_COUNT_RANGE.max);
  const cities: City[] = [];
  let attempts = 0;

  while (cities.length < cityCount && attempts < MAX_CITY_PLACEMENT_ATTEMPTS) {
    attempts += 1;

    const x = getRandomInt(random, 0, MAP_WIDTH - 1);
    const y = getRandomInt(random, 0, MAP_HEIGHT - 1);

    if (map[y][x].type !== TileType.GRASS || !isFarEnoughFromCities(x, y, cities)) {
      continue;
    }

    cities.push({
      id: `city-${cities.length + 1}`,
      name: createCityName(random),
      x,
      y,
      population: getRandomInt(random, 60, 450),
    });
  }

  return cities;
};

export function generateMap(seed: number = Math.random()): World {
  const map: TileMap = [];
  
  // Simple seeded random function for reproducible maps
  const seededRandom = (() => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();

  const prng = Alea(seededRandom());
  const noise = createNoise2D(prng);


  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: Tile[] = [];
    
    for (let x = 0; x < MAP_WIDTH; x++) {
      const value = (noise(x*SCALE, y*SCALE) + 1) / 2
      const type = value < 0.4 ? TileType.WATER : TileType.GRASS;
      row.push({
        type,
        x,
        y,
      });
    }
    map.push(row);
  }

  return {
    map,
    cities: generateCities(map, seededRandom),
  };
}

export { CITY_COUNT_RANGE, MAP_WIDTH, MAP_HEIGHT };
