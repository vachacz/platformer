export const CONSTANTS = {
  tickHz: 20,
  snapshotMs: 50,
  speeds: { move: 4, ladder: 2, projectile: 12 },
  fireRatePerSec: 2,
  spawnProtectionMs: 3000,
} as const;

export type ClientInput = {
  seq: number;
  ts: number;
  moveLeft?: boolean;
  moveRight?: boolean;
  moveUp?: boolean;
  moveDown?: boolean;
  fire?: boolean;
};

export type WelcomeMessage = {
  type: 'welcome';
  playerId: string;
  map: { width: number; height: number; tiles: string[] };
  constants: typeof CONSTANTS;
};

export type SnapshotMessage = {
  type: 'snapshot';
  serverTick: number;
  players: Array<{ 
    id: string; 
    feetX: number; 
    feetY: number; 
    hp: number; 
    frags: number; 
    state: 'ground' | 'ladder' | 'air'; 
    spawnProtected: boolean;
    direction: 'left' | 'right';
  }>;
  projectiles: Array<{ 
    id: string; 
    feetX: number; 
    feetY: number; 
    vx: number;
    vy: number;
    ownerId: string;
  }>;
  events?: Array<{ type: 'kill' | 'respawn' | 'reset'; data: unknown }>;
};

export type ServerMessage = WelcomeMessage | SnapshotMessage | { type: 'error'; code: string; message: string } | { type: 'pong'; ts: number };

export type ClientMessage = { type: 'join'; name: string } | { type: 'input'; data: ClientInput } | { type: 'ping'; ts: number };

export * from './map';

