export enum TileType {
  WATER = 'water',
  GRASS = 'grass',
  MOUNTAIN = 'mountain',
}

export interface Tile {
  type: TileType;
  x: number;
  y: number;
}

export type City = {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
};

export type TileMap = Tile[][];

export type World = {
  map: TileMap;
  cities: City[];
};

export type Event = {
    id: string;
    day: number;
    message: string;
}