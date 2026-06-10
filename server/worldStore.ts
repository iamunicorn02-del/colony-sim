import WebSocket from 'ws';
import { Event, World } from '../app/types/tiles';
import { DAY_TICK_MS, EVENT_INTERVAL_DAYS, MAX_EVENT_LOG_SIZE } from '../app/config';
import { updateWorldForNewDay } from './simulationEngine';

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

  if (entry.day % EVENT_INTERVAL_DAYS === 0) {
    const event: Event = {
      id: `evt-${Date.now()}`,
      day: entry.day,
      message: `Passed ${entry.day} days`,
    };
    entry.eventLog.push(event);
    if (entry.eventLog.length > MAX_EVENT_LOG_SIZE) {
      entry.eventLog.shift();
    }
  }

  broadcast(id, {
    type: 'worldState',
    world: entry.world,
    day: entry.day,
    eventLog: entry.eventLog,
  });
}
