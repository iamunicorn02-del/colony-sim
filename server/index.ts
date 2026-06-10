import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handleMessage } from './socketHandler';
import { generateMap } from './mapGenerator';
import { createWorldEntry, getWorldEntry } from './worldStore';

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3001;

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /health — health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // POST /api/world — create new world
  if (req.url === '/api/world' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let seed: number | undefined;
      try {
        const parsed = JSON.parse(body);
        seed = parsed.seed;
      } catch {
        // ignore invalid JSON
      }
      const world = generateMap(seed ?? 42);
      const worldId = createWorldEntry(world);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ worldId, world }));
    });
    return;
  }

  // GET /api/world/:id — get world state
  const worldMatch = req.url?.match(/^\/api\/world\/([a-zA-Z0-9-]+)$/);
  if (worldMatch && req.method === 'GET') {
    const worldId = worldMatch[1];
    const entry = getWorldEntry(worldId);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'World not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ world: entry.world, day: entry.day, eventLog: entry.eventLog }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({
  server: httpServer,
});

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin ?? 'unknown';
  console.log(`[WS] Client connected (origin: ${origin})`);

  ws.on('message', (data) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', (code) => {
    console.log(`[WS] Client disconnected (${code})`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
  });
});

const shutdown = () => {
  console.log('\nShutting down...');
  wss.close();
  httpServer.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

httpServer.listen(PORT, () => {
  console.log(`[WS] Server listening on ws://localhost:${PORT}`);
  console.log(`[WS] HTTP API: http://localhost:${PORT}/api/world`);

  // Seed a demo world
  const worldId = createWorldEntry(generateMap(42));
  console.log(`[WS] Demo world: ${worldId}`);
});
