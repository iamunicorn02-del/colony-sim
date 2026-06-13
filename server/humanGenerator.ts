import type { Human } from '../shared/types';
import type { City, TileMap } from '../app/types/tiles';
import { TileType } from '../app/types/tiles';
import { MAP_WIDTH, MAP_HEIGHT } from '../app/config';
import {
  HUMAN_SPAWN_OFFSET_RANGE,
  HUMAN_INITIAL_HUNGER_RANGE,
  HUMAN_INITIAL_ENERGY_RANGE,
  HUMAN_INITIAL_HEALTH_RANGE,
  HUMAN_INITIAL_MOOD_RANGE,
} from './config/serverConfig';

const FIRST_NAMES = [
  'John', 'Jane', 'Bob', 'Alice', 'Charlie',
  'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateHumansForCity(city: City, count: number, map: TileMap): Human[] {
  const humans: Human[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[randInt(0, LAST_NAMES.length - 1)];

    // Find a walkable grass tile near the city, retrying up to 20 times
    let x = city.x;
    let y = city.y;
    for (let attempt = 0; attempt < 20; attempt++) {
      const offsetX = randInt(HUMAN_SPAWN_OFFSET_RANGE.min, HUMAN_SPAWN_OFFSET_RANGE.max);
      const offsetY = randInt(HUMAN_SPAWN_OFFSET_RANGE.min, HUMAN_SPAWN_OFFSET_RANGE.max);
      const candidateX = clamp(city.x + offsetX, 0, MAP_WIDTH - 1);
      const candidateY = clamp(city.y + offsetY, 0, MAP_HEIGHT - 1);
      if (map[candidateY][candidateX].type === TileType.GRASS) {
        x = candidateX;
        y = candidateY;
        break;
      }
    }

    humans.push({
      id: `human-${city.id}-${i}`,
      name: `${firstName} ${lastName}`,
      cityId: city.id,
      x,
      y,
      hunger: randInt(HUMAN_INITIAL_HUNGER_RANGE.min, HUMAN_INITIAL_HUNGER_RANGE.max),
      energy: randInt(HUMAN_INITIAL_ENERGY_RANGE.min, HUMAN_INITIAL_ENERGY_RANGE.max),
      health: randInt(HUMAN_INITIAL_HEALTH_RANGE.min, HUMAN_INITIAL_HEALTH_RANGE.max),
      mood: randInt(HUMAN_INITIAL_MOOD_RANGE.min, HUMAN_INITIAL_MOOD_RANGE.max),
      currentAction: 'idle',
    });
  }

  return humans;
}
