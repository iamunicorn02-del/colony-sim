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

export enum CityTrait {
  WARLIKE = 'warlike',
  TRADER = 'trader',
  AGRICULTURAL = 'agricultural',
  FORTUNATE = 'fortunate',
  DOOMED = 'doomed',
  EXPANSIONIST = 'expansionist',
  ISOLATED = 'isolated',
}

/** Transient state derived from simulation — recomputed each tick. */
export type CityStatus = {
  /** One of: 'thriving' | 'stable' | 'struggling' | 'starving' | 'golden_age' | 'dark_age' */
  state: string;
  /** Trait-derived visual tint applied by the renderer. */
  color: string;
};

export type City = {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
  food: number;
  gold: number;
  traits: CityTrait[];
  status: CityStatus;
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