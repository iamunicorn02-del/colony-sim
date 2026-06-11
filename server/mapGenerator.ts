import { City, CityTrait, TileType, Tile, TileMap, World } from '../app/types/tiles';
import { createNoise2D } from "simplex-noise"
import Alea from 'alea';
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  DETAIL_NOISE_SCALE,
  CONTINENTAL_NOISE_SCALE,
  DETAIL_NOISE_WEIGHT,
  CONTINENTAL_NOISE_WEIGHT,
  CITY_COUNT_RANGE,
  MIN_CITY_DISTANCE,
  MAX_CITY_PLACEMENT_ATTEMPTS,
  CITY_NAME_PARTS,
  CITY_NAME_SUFFIXES,
  TILE_THRESHOLD_WATER,
  TILE_THRESHOLD_GRASS,
  CITY_INITIAL_FOOD_RANGE,
  CITY_INITIAL_GOLD_RANGE,
  CITY_TRAIT_COUNT,
  CITY_TRAIT_POOL,
} from '../app/config';
import { computeCityStatus } from './simulationEngine';

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

/** Pick N random distinct traits from the pool. */
const pickTraits = (random: () => number): CityTrait[] => {
  const count = Math.floor(random() * (CITY_TRAIT_COUNT.max - CITY_TRAIT_COUNT.min + 1)) + CITY_TRAIT_COUNT.min;
  const pool = [...CITY_TRAIT_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
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

    const city: City = {
      id: `city-${cities.length + 1}`,
      name: createCityName(random),
      x,
      y,
      humanIds: [],
      food: getRandomInt(random, CITY_INITIAL_FOOD_RANGE.min, CITY_INITIAL_FOOD_RANGE.max),
      gold: getRandomInt(random, CITY_INITIAL_GOLD_RANGE.min, CITY_INITIAL_GOLD_RANGE.max),
      traits: pickTraits(random),
      status: { state: 'stable', color: '#facc15' },
      relationships: {},
      goldenAgeDays: 0,
      darkAgeDays: 0,
      epidemicDays: 0,
    };
    city.status = computeCityStatus(city);
    cities.push(city);
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
      const value = noise(x*DETAIL_NOISE_SCALE, y*DETAIL_NOISE_SCALE)*DETAIL_NOISE_WEIGHT + noise(x*CONTINENTAL_NOISE_SCALE, y*CONTINENTAL_NOISE_SCALE)*CONTINENTAL_NOISE_WEIGHT
      const type = value < TILE_THRESHOLD_WATER ? TileType.WATER : value < TILE_THRESHOLD_GRASS ? TileType.GRASS : TileType.MOUNTAIN;
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
    humans: {},
  };
}
