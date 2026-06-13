import WebSocket from 'ws';
import { Event, World } from '../app/types/tiles';
import { DAY_TICK_MS, MAX_EVENT_LOG_SIZE, MAX_TRADE_EVENTS_PER_TICK } from '../app/config';
import { computeCityStatus, updateWorldForNewDay } from './simulationEngine';
import { maybeGenerateEvent } from './worldEvents';
import { resolveTrades } from './trading';
import { generateHumansForCity } from './humanGenerator';
import { HUMANS_PER_CITY_RANGE } from './config/serverConfig';

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export type WorldEntry = {
  id: string;
  world: World;
  day: number;
  eventLog: Event[];
  /** Short description of the most important event today (for spectator UI). */
  dailyStory: string | null;
  tickInterval: ReturnType<typeof setInterval>;
  clients: Set<WebSocket>;
};

const worlds = new Map<string, WorldEntry>();

let nextId = 1;

export function createWorldEntry(world: World): string {
  // Generate humans for each city
  for (const city of world.cities) {
    const count = randInt(HUMANS_PER_CITY_RANGE.min, HUMANS_PER_CITY_RANGE.max);
    const humans = generateHumansForCity(city, count, world.map);
    const ids: string[] = [];
    for (const human of humans) {
      world.humans[human.id] = human;
      ids.push(human.id);
    }
    city.humanIds = ids;
  }

  const id = `world-${nextId++}`;
  const entry: WorldEntry = {
    id,
    world,
    day: 0,
    eventLog: [],
    dailyStory: null,
    tickInterval: setInterval(() => tickWorld(id), DAY_TICK_MS),
    clients: new Set(),
  };
  worlds.set(id, entry);
  return id;
}

export function getWorldEntry(id: string): WorldEntry | undefined {
  return worlds.get(id);
}

export function getWorldIds(): string[] {
  return Array.from(worlds.keys());
}

export function addClient(worldId: string, ws: WebSocket): boolean {
  const entry = worlds.get(worldId);
  if (!entry) return false;
  entry.clients.add(ws);
  return true;
}

export function removeClient(worldId: string, ws: WebSocket): boolean {
  const entry = worlds.get(worldId);
  if (!entry) return false;
  entry.clients.delete(ws);
  return true;
}

export function broadcast(worldId: string, message: unknown) {
  const entry = worlds.get(worldId);
  if (!entry) return;
  const json = JSON.stringify(message);
  entry.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  });
}

function tickWorld(id: string) {
  const entry = worlds.get(id);
  if (!entry) return;

  entry.day += 1;
  const simResult = updateWorldForNewDay(entry.world);
  entry.world = simResult.world;
  for (const evt of simResult.events) {
    evt.day = entry.day;
    entry.eventLog.push(evt);
  }

  // Resolve trade between nearby cities.
  const tradeResult = resolveTrades(entry.world.cities, entry.world.map);
  // Recompute status after trades change food/gold balances.
  const citiesAfterTrade = tradeResult.cities.map((c) => ({
    ...c,
    status: computeCityStatus(c),
  }));
  entry.world = { ...entry.world, cities: citiesAfterTrade };
  for (let i = 0; i < Math.min(tradeResult.trades.length, MAX_TRADE_EVENTS_PER_TICK); i++) {
    const t = tradeResult.trades[i];
    const seller = entry.world.cities.find((c) => c.id === t.sellerId);
    const buyer = entry.world.cities.find((c) => c.id === t.buyerId);
    if (!seller || !buyer) continue;
    entry.eventLog.push({
      id: `trade-${entry.day}-${i}`,
      day: entry.day,
      message: `Trade: ${seller.name} → ${buyer.name} (${t.food} food for ${t.gold} gold)`,
      kind: 'caravan' as const,
      affectedCityIds: [t.sellerId, t.buyerId],
      severity: 'minor' as const,
    });
  }

  const result = maybeGenerateEvent(entry.world, entry.day);
  if (result) {
    entry.world = result.world;
    entry.eventLog.push(result.event);
  }

  // --- Generate daily story (most important event of the day) ---
  let dailyStory: string | null = null;
  if (result && result.event.severity === 'cataclysmic') {
    dailyStory = result.event.message;
  } else if (result && result.event.severity === 'major') {
    dailyStory = result.event.message;
  } else if (result) {
    dailyStory = result.event.message;
  } else if (tradeResult.trades.length > 0) {
    const t = tradeResult.trades[0];
    const seller = entry.world.cities.find((c) => c.id === t.sellerId);
    const buyer = entry.world.cities.find((c) => c.id === t.buyerId);
    if (seller && buyer) {
      dailyStory = `💰 ${seller.name} traded ${t.food} food to ${buyer.name}`;
    }
  }
  entry.dailyStory = dailyStory;

  if (entry.eventLog.length > MAX_EVENT_LOG_SIZE) {
    entry.eventLog = entry.eventLog.slice(-MAX_EVENT_LOG_SIZE);
  }

  broadcast(id, {
    type: 'worldState',
    world: entry.world,
    day: entry.day,
    eventLog: entry.eventLog,
    dailyStory: entry.dailyStory,
    tradeLinks: tradeResult.trades,
  });
}
