import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { CONSTANTS, type ServerMessage, type ClientMessage, type MapData } from '@game/shared';
import { loadMapFromFile } from './mapLoader.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from './game.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const wss = new WebSocketServer({ port: PORT });

// Load demo map (Phase 1)
let gameMap: MapData;
try {
  const here = fileURLToPath(new URL('.', import.meta.url)); // .../server/src/
  const repoRoot = path.resolve(here, '..', '..'); // .../other/game/
  const mapPath = path.resolve(repoRoot, 'sample.map');
  gameMap = loadMapFromFile(mapPath);
  console.log(`Loaded map ${mapPath} (${gameMap.width}x${gameMap.height})`);
} catch (err) {
  console.error('Failed to load map:', err);
  process.exit(1);
}

const game = new Game(gameMap);
game.start();

type Client = { id: string; ws: import('ws').WebSocket };
const clients = new Map<string, Client>();

wss.on('connection', (ws) => {
  const id = nanoid();
  const client: Client = { id, ws };
  clients.set(id, client);
  console.log(`[conn] new connection tempId=${id}, total=${clients.size}`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw)) as ClientMessage;
      if (msg.type === 'ping') {
        const res: ServerMessage = { type: 'pong', ts: msg.ts };
        ws.send(JSON.stringify(res));
      } else if (msg.type === 'join') {
        const p = game.addPlayer(msg.name || 'Guest');
        client.id = p.id;
        game.setInput(p.id, {});
        const welcome: ServerMessage = {
          type: 'welcome',
          playerId: p.id,
          map: gameMap,
          constants: CONSTANTS,
        };
        ws.send(JSON.stringify(welcome));
        console.log(`[join] playerId=${p.id} name=${msg.name} clients=${clients.size}`);
      } else if (msg.type === 'input') {
        // route inputs to the most recent player instance for this connection
        const pid = client.id;
        if (pid) {
          const inputData = msg.data as any;
          game.setInput(pid, inputData);
        }
      }
      // In Phase 0 we don't implement game logic yet.
    } catch {
      const err: ServerMessage = { type: 'error', code: 'BAD_JSON', message: 'Invalid message' };
      ws.send(JSON.stringify(err));
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    if (client.id) game.removePlayer(client.id);
    console.log(`[disc] tempId=${id} playerId=${client.id} total=${clients.size}`);
  });
});

console.log(`Server listening on ws://localhost:${PORT} (tick ${CONSTANTS.tickHz}Hz)`);

// Broadcast snapshots at snapshot cadence
let snapCount = 0;
setInterval(() => {
  const snap = game.snapshot();
  const payload = JSON.stringify(snap);
  for (const { ws } of clients.values()) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
  snapCount++;
}, CONSTANTS.snapshotMs);

