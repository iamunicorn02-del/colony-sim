import type { Human } from '../shared/types';
import type { City } from '../app/types/tiles';

const FIRST_NAMES = [
  'John', 'Jane', 'Bob', 'Alice', 'Charlie',
  'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones',
  'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
];

const MAP_MIN = 0;
const MAP_MAX = 99;

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

    const offsetX = randInt(-2, 2);
    const offsetY = randInt(-2, 2);

    humans.push({
      id: `human-${city.id}-${i}`,
      name: `${firstName} ${lastName}`,
      cityId: city.id,
      x: clamp(city.x + offsetX, MAP_MIN, MAP_MAX),
      y: clamp(city.y + offsetY, MAP_MIN, MAP_MAX),
      hunger: randInt(70, 100),
      energy: randInt(70, 100),
      currentAction: 'idle',
    });
  }

  return humans;
}
