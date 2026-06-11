import type { Event, World } from '../types/tiles';

export type TradeLink = {
  sellerId: string;
  buyerId: string;
  food: number;
  gold: number;
};

export type ServerMessage =
  | { type: 'worldState'; world: World; day: number; eventLog: Event[]; tradeLinks: TradeLink[] }
  | { type: 'event'; day: number; message: string }
  | { type: 'error'; message: string }
  | { type: 'pong' };

function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:3001';
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return envUrl;
  // Auto-derive from current host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:3001`;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 2000;

type MessageHandler = (msg: ServerMessage) => void;

export function createWorldSocket() {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  const messageHandlers: Set<MessageHandler> = new Set();
  let isDestroyed = false;
  let currentWorldId: string | null = null;

  const clearTimers = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const doConnect = () => {
    if (isDestroyed || !currentWorldId) return;

    clearTimers();

    try {
      const url = getWsUrl();
      console.log('[WS] Connecting to', url);
      ws = new WebSocket(url);

      ws.onopen = () => {
        if (isDestroyed) {
          ws?.close();
          return;
        }
        console.log('[WS] Connected');
        reconnectAttempts = 0;
        ws!.send(JSON.stringify({ type: 'joinWorld', worldId: currentWorldId }));
        heartbeatTimer = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (isDestroyed) return;
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          messageHandlers.forEach((handler) => handler(msg));
        } catch {
          // ignore
        }
      };

      ws.onerror = (e) => {
        console.error('[WS] Error:', e);
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event.reason);
        clearTimers();
        if (!isDestroyed && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = RECONNECT_BASE_DELAY * reconnectAttempts;
          console.log(`[WS] Reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
          reconnectTimer = setTimeout(doConnect, delay);
        }
      };
    } catch (err) {
      console.error('[WS] Connect failed:', err);
      if (!isDestroyed && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        reconnectTimer = setTimeout(doConnect, RECONNECT_BASE_DELAY * reconnectAttempts);
      }
    }
  };

  return {
    connect: (worldId: string) => {
      currentWorldId = worldId;
      reconnectAttempts = 0;
      doConnect();
    },

    disconnect: () => {
      console.log('[WS] Destroy');
      isDestroyed = true;
      clearTimers();
      if (ws) {
        ws.close(1000, 'Client disconnecting');
        ws = null;
      }
      messageHandlers.clear();
    },

    onMessage: (handler: MessageHandler) => {
      messageHandlers.add(handler);
      return () => messageHandlers.delete(handler);
    },
  };
}
