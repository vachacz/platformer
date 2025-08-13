import { Application, Graphics } from 'pixi.js';
import { CONSTANTS, type ServerMessage } from '@game/shared';
import type { WelcomeMessage } from '@game/shared';
import { renderMap } from './mapView.js';
import { createKeyboard } from './input.js';
import { createPlayersLayer } from './playerView.js';
import { createProjectilesLayer } from './projectileView.js';

const app = new Application();
const root = document.getElementById('app')!;

async function start() {
  await app.init({ width: 640, height: 360, background: '#1e1e1e' });
  root.appendChild(app.canvas);
  const kb = createKeyboard();
  kb.attach();
  let playersLayer: ReturnType<typeof createPlayersLayer> | null = null;
  let projectilesLayer: ReturnType<typeof createProjectilesLayer> | null = null;

  // Minimal connection to server
  const ws = new WebSocket('ws://localhost:8080');
  ws.addEventListener('open', () => {
    console.log('WS connected');
    ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    // Request welcome + map
    const name = `Guest-${Math.floor(Math.random() * 1000)}`;
    console.log('join as', name);
    ws.send(JSON.stringify({ type: 'join', name }));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data)) as ServerMessage;
    if (msg.type === 'pong') {
      console.log('pong', msg.ts);
    } else if (msg.type === 'welcome') {
      const w = msg as WelcomeMessage;
      console.log('welcome: playerId=', w.playerId, ' map=', w.map.width, 'x', w.map.height);
      // Resize canvas to map size
      const width = w.map.width * 32;
      const height = w.map.height * 32;
      // Resize renderer to map dimensions
      try {
        // Pixi v7 signature
        // @ts-ignore
        app.renderer.resize(width, height);
      } catch {
        // Pixi v8 signature (if available)
        // @ts-ignore
        app.renderer.resize({ width, height });
      }
      // Ensure canvas element reflects new size for CSS layout
      app.canvas.style.width = `${width}px`;
      app.canvas.style.height = `${height}px`;
      const mapNode = renderMap(w.map);
      app.stage.addChild(mapNode);
      
      // Create players layer with map height for coordinate mapping
      playersLayer = createPlayersLayer(w.map.height);
      app.stage.addChild(playersLayer.node);

      // Create projectiles layer
      projectilesLayer = createProjectilesLayer(w.map.height);
      app.stage.addChild(projectilesLayer.node);
    } else if (msg.type === 'snapshot') {
      playersLayer?.render(msg as any);
      projectilesLayer?.render(msg as any);
    }
  });

  // Send inputs at tick rate
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const inputData = {
        seq: Date.now(),
        ts: Date.now(),
        moveLeft: kb.keys.left,
        moveRight: kb.keys.right,
        moveUp: kb.keys.up,
        moveDown: kb.keys.down,
        fire: kb.keys.fire,
      };
      
      // DEBUG: Log vertical inputs when they occur
      if (inputData.moveUp || inputData.moveDown) {
        console.log(`[CLIENT INPUT] moveUp=${inputData.moveUp} moveDown=${inputData.moveDown}`);
      }
      
      ws.send(
        JSON.stringify({
          type: 'input',
          data: inputData,
        })
      );
    }
  }, Math.round(1000 / CONSTANTS.tickHz));

  // Placeholder removed; positions will come from snapshots

  console.log(`Client started. Tick ${CONSTANTS.tickHz}Hz, snapshot ${CONSTANTS.snapshotMs}ms.`);
}

start();

