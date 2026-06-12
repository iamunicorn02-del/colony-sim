import type { Human } from '../shared/types';
import type { City } from '../app/types/tiles';
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

export function generateHumansForCity(city: City, count: number): Human[] {
  const humans: Human[] = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[randInt(0, LAST_NAMES.length - 1)];

    const offsetX = randInt(HUMAN_SPAWN_OFFSET_RANGE.min, HUMAN_SPAWN_OFFSET_RANGE.max);
    const offsetY = randInt(HUMAN_SPAWN_OFFSET_RANGE.min, HUMAN_SPAWN_OFFSET_RANGE.max);

    humans.push({
      id: `human-${city.id}-${i}`,
      name: `${firstName} ${lastName}`,
      cityId: city.id,
      x: clamp(city.x + offsetX, 0, MAP_WIDTH - 1),
      y: clamp(city.y + offsetY, 0, MAP_HEIGHT - 1),
      hunger: randInt(HUMAN_INITIAL_HUNGER_RANGE.min, HUMAN_INITIAL_HUNGER_RANGE.max),
      energy: randInt(HUMAN_INITIAL_ENERGY_RANGE.min, HUMAN_INITIAL_ENERGY_RANGE.max),
      health: randInt(HUMAN_INITIAL_HEALTH_RANGE.min, HUMAN_INITIAL_HEALTH_RANGE.max),
      mood: randInt(HUMAN_INITIAL_MOOD_RANGE.min, HUMAN_INITIAL_MOOD_RANGE.max),
      currentAction: 'idle',
    });
  }

  return humans;
}
