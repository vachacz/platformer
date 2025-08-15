export const CONSTANTS = {
  tickHz: 20,
  snapshotMs: 50,
  speeds: { move: 4, ladder: 2, projectile: 12, jetpack: 6 },
  fireRatePerSec: 4,
  spawnProtectionMs: 3000,
  
  // Physics & Game Balance
  gravity: 25,
  lethalVelocity: 8,
  maxJetpackVelocity: 3,
  jetpackThrust: 4,
  hitDetectionRadius: 0.4,
  
  // Combat & Health
  projectileDamage: 10,
  initialHP: 100,
} as const;

// Player colors - unique colors for each player
export const PLAYER_COLORS = [
  0x2ecc71, // Green
  0xe74c3c, // Red  
  0x3498db, // Blue
  0xf39c12, // Orange
  0x9b59b6, // Purple
  0x1abc9c, // Teal
  0xf1c40f, // Yellow
  0xe67e22, // Dark Orange
  0x34495e, // Dark Blue
  0x95a5a6, // Gray
] as const;

export type ClientInput = {
  seq: number;
  ts: number;
  moveLeft?: boolean;
  moveRight?: boolean;
  moveUp?: boolean;
  moveDown?: boolean;
  fire?: boolean;
  jetpack?: boolean;
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
    colorIndex: number;
    jetpackActive: boolean;
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

