import { TileType, Tile, TileMap } from '@/app/types/tiles';
import { createNoise2D } from "simplex-noise"
import Alea from 'alea';

const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const SCALE = 0.1;

export function generateMap(seed: number = Math.random()): TileMap {
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

  return map;
}

export { MAP_WIDTH, MAP_HEIGHT };
