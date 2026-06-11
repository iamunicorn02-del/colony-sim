import WebSocket from 'ws';
import {
  getWorldEntry,
  addClient,
  removeClient,
  broadcast,
} from './worldStore';
import { TradeLink } from './trading';
import { World, City, Event } from '../app/types/tiles';

type CityPayload = Omit<City, 'humanIds'>;
type WorldPayload = { map: World['map']; cities: CityPayload[]; humans: World['humans'] };

export type ClientMessage =
  | { type: 'joinWorld'; worldId: string }
  | { type: 'action'; worldId: string; payload: unknown }
  | { type: 'ping' };

export type ServerMessage =
  | { type: 'worldState'; world: WorldPayload; day: number; eventLog: Event[]; dailyStory: string | null; tradeLinks: TradeLink[] }
  | { type: 'event'; day: number; message: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export function handleMessage(ws: WebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    sendError(ws, 'Invalid JSON');
    return;
  }

  switch (msg.type) {
    case 'joinWorld': {
      const { worldId } = msg as { type: 'joinWorld'; worldId: string };
      const entry = getWorldEntry(worldId);
      if (!entry) {
        sendError(ws, `World ${worldId} not found`);
        return;
      }
      addClient(worldId, ws);
      const cleanCities = entry.world.cities.map(({ humanIds, ...rest }) => rest);
      ws.send(
        JSON.stringify({
          type: 'worldState',
          world: { ...entry.world, cities: cleanCities },
          day: entry.day,
          eventLog: entry.eventLog,
          dailyStory: entry.dailyStory,
          tradeLinks: [],
        })
      );
      break;
    }

    case 'action': {
      const { worldId, payload } = msg as {
        type: 'action';
        worldId: string;
        payload: unknown;
      };
      const entry = getWorldEntry(worldId);
      if (!entry) {
        sendError(ws, `World ${worldId} not found`);
        return;
      }
      // Future: handle player actions (e.g., upgrade city, explore tile)
      console.log('Action received:', payload);
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    }

    default:
      sendError(ws, `Unknown message type: ${(msg as { type: string }).type}`);
  }
}

function sendError(ws: WebSocket, message: string) {
  ws.send(JSON.stringify({ type: 'error', message }));
}
