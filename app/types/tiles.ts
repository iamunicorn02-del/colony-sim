import type { Human as _Human } from '../../shared/types';
export type Human = _Human;
export type HumanAction = 'idle' | 'moving' | 'eating' | 'resting';

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

export type CityState =
  | 'starving'
  | 'struggling'
  | 'stable'
  | 'thriving'
  | 'golden_age'
  | 'dark_age';

/** Transient state derived from simulation — recomputed each tick. */
export type CityStatus = {
  state: CityState;
  color: string;
};

export type City = {
  id: string;
  name: string;
  x: number;
  y: number;
  humanIds: string[];
  food: number;
  gold: number;
  traits: CityTrait[];
  status: CityStatus;
  /** Relations with other cities — ally, enemy or neutral. */
  relationships: Record<string, 'ally' | 'enemy' | 'neutral'>;
  /** Days remaining while city is in golden age (special prosperity state). */
  goldenAgeDays: number;
  /** Days remaining while city is in dark age (special decline state). */
  darkAgeDays: number;
  /** Days remaining while city is under epidemic (spread via trade routes). */
  epidemicDays: number;
};

export type TileMap = Tile[][];

export type World = {
  map: TileMap;
  cities: City[];
  humans: Record<string, Human>;
};

/**
 * Severity (вес) of an event — used for display and filtering.
 */
export type EventSeverity = 'minor' | 'major' | 'cataclysmic';

/**
 * Predefined event kinds used for coloring / filtering the event log.
 */
export type EventKind =
  | 'harvest'
  | 'plague'
  | 'golden_age'
  | 'dark_age'
  | 'drought'
  | 'flood'
  | 'conflict'
  | 'alliance'
  | 'colony'
  | 'epidemic'
  | 'caravan'
  | 'fortune'
  | 'misfortune'
  | 'human_action'
  | 'birth'
  | 'city_ruins';

export type Event = {
  id: string;
  day: number;
  message: string;
  kind: EventKind;
  /** Which cities are directly involved (for UI filtering / highlighting). */
  affectedCityIds?: string[];
  /** How impactful the event was (defaults to 'minor'). */
  severity?: EventSeverity;
};