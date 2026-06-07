export enum TileType {
  WATER = 'water',
  GRASS = 'grass',
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export type TileMap = Tile[][];
