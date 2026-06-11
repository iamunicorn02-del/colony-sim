import WebSocket from 'ws';
import { Event, World } from '../app/types/tiles';
import { DAY_TICK_MS, MAX_EVENT_LOG_SIZE, MAX_TRADE_EVENTS_PER_TICK } from '../app/config';
import { computeCityStatus, updateWorldForNewDay } from './simulationEngine';
import { maybeGenerateEvent } from './worldEvents';
import { resolveTrades } from './trading';

export type WorldEntry = {
  id: string;
  world: World;
  day: number;
  eventLog: Event[];
  tickInterval: ReturnType<typeof setInterval>;
  clients: Set<WebSocket>;
};

const worlds = new Map<string, WorldEntry>();

let nextId = 1;

export function createWorldEntry(world: World): string {
  const id = `world-${nextId++}`;
  const entry: WorldEntry = {
    id,
    world,
    day: 0,
    eventLog: [],
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
  entry.world = updateWorldForNewDay(entry.world);

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
    });
  }

  const result = maybeGenerateEvent(entry.world, entry.day);
  if (result) {
    entry.world = result.world;
    entry.eventLog.push(result.event);
  }

  if (entry.eventLog.length > MAX_EVENT_LOG_SIZE) {
    entry.eventLog = entry.eventLog.slice(-MAX_EVENT_LOG_SIZE);
  }

  broadcast(id, {
    type: 'worldState',
    world: entry.world,
    day: entry.day,
    eventLog: entry.eventLog,
    tradeLinks: tradeResult.trades,
  });
}
