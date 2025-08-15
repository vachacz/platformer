import { nanoid } from 'nanoid';
import { CONSTANTS, TILE, PLAYER_COLORS, type MapData, type SnapshotMessage } from '@game/shared';

// Game constants
const MOVE_SPEED = CONSTANTS.speeds.move;
const LADDER_SPEED = CONSTANTS.speeds.ladder;
const GRAVITY = 25;
const LETHAL_VELOCITY = 8;
const MAX_JETPACK_VELOCITY = 3;

// Map boundary constants  
const MAP_BOUNDARY_OFFSET = 0.5;

// Physics constants
const JETPACK_THRUST = 4;
const PROJECTILE_DAMAGE = 10;
const HIT_DETECTION_RADIUS = 0.4;

// Spawn constants
const SPAWN_ATTEMPTS = 20;
const INITIAL_HP = 100;
const TILE_CENTER_OFFSET = 0.5; // offset to center of tile

export type PlayerState = 'ground' | 'ladder' | 'air';

// Helper functions for multi-state system
function hasState(player: Player, state: PlayerState): boolean {
  return player.states.includes(state);
}

function setState(player: Player, states: PlayerState[]): void {
  player.states = [...states];
}

export type Player = {
  id: string;
  name: string;
  feetX: number; // feet position in tiles (reference point)
  feetY: number; // feet position in tiles (reference point)
  vx: number;
  vy: number;
  hp: number;
  frags: number;
  states: PlayerState[];
  spawnProtectedUntil: number;
  canFireAt: number;
  direction: 'left' | 'right';
  colorIndex: number;
  jetpackActive: boolean;
};

export type Projectile = {
  id: string;
  feetX: number;
  feetY: number;
  vx: number;
  vy: number;
  ownerId: string;
  createdAt: number;
};

export type PlayerInput = {
  moveLeft?: boolean;
  moveRight?: boolean;
  moveUp?: boolean;
  moveDown?: boolean;
  fire?: boolean;
  jetpack?: boolean;
};

export class Game {
  private players = new Map<string, Player>();
  private projectiles = new Map<string, Projectile>();
  private inputs = new Map<string, PlayerInput>();
  private lastTickAt = 0;
  private usedColorIndices = new Set<number>();

  constructor(public map: MapData) {}

  private getNextAvailableColorIndex(): number {
    // Find first available color index
    for (let i = 0; i < PLAYER_COLORS.length; i++) {
      if (!this.usedColorIndices.has(i)) {
        this.usedColorIndices.add(i);
        return i;
      }
    }
    // If all colors are used, cycle back to start
    return Math.floor(Math.random() * PLAYER_COLORS.length);
  }

  private releaseColorIndex(colorIndex: number): void {
    this.usedColorIndices.delete(colorIndex);
  }

  private tileAt(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return TILE.EMPTY;
    const tileY = Math.floor(y);
    const tileX = Math.floor(x);
    if (tileY < 0 || tileY >= this.map.height || tileX < 0 || tileX >= this.map.width) return TILE.EMPTY;
    const tile = this.map.tiles[tileY][tileX];
    return tile;
  }

  private log(player: Player, action: string, message: string): void {
    const feetTile = this.tileAt(player.feetX, player.feetY);
    const states = player.states.join(',');
    const feetPos = `${player.feetX.toFixed(2)} x ${player.feetY.toFixed(2)}`;
    console.log(`[${states}@${feetTile}] [${feetPos}] [${action}] ${message}`);
  }

  private isGroundTile(tile: string): boolean {
    return tile === TILE.FLOOR || tile === TILE.LADDER_TOP || tile === TILE.LADDER_UP || tile === TILE.LADDER_CROSS;
  }

  private isPlayerOnGround(p: Player): boolean {
    const feetTile = this.tileAt(p.feetX, p.feetY);
    return this.isGroundTile(feetTile) && p.feetY - Math.floor(p.feetY) < 0.1;
    }

  private isPlayerOnLadder(p: Player): boolean {
    const feetTile = this.tileAt(p.feetX, p.feetY);
    return feetTile === TILE.LADDER_TOP || feetTile === TILE.LADDER || feetTile === TILE.LADDER_CROSS || feetTile === TILE.LADDER_UP;
  }

  private canMoveDown(p: Player): boolean {
    const feetTile = this.tileAt(p.feetX, p.feetY);
    
    // Special case for LADDER_UP (U): can only move down if staying within the same tile
    if (feetTile === TILE.LADDER_UP) {
      const currentTileY = Math.floor(p.feetY);
      const nextY = p.feetY - LADDER_SPEED / CONSTANTS.tickHz;
      const nextTileY = Math.floor(nextY);
      
      // Can only move down if staying in the same tile
      return nextTileY >= currentTileY;
    }
    
    return feetTile === TILE.LADDER_TOP || feetTile === TILE.LADDER || feetTile === TILE.LADDER_CROSS;
  }

  private canMoveUp(p: Player): boolean {
    const feetTile = this.tileAt(p.feetX, p.feetY);
    return feetTile === TILE.LADDER_UP || feetTile === TILE.LADDER || feetTile === TILE.LADDER_CROSS;
  }

  private canMoveLeft(p: Player): boolean {
    return this.isPlayerOnGround(p) || p.jetpackActive;
  }

  private canMoveRight(p: Player): boolean {
     return this.isPlayerOnGround(p) || p.jetpackActive;
  }

  private handleHorizontalMovement(p: Player, input: PlayerInput): void {
    p.vx = 0;
    
    if (input.moveLeft) {
      p.direction = 'left';
      if (this.canMoveLeft(p)) {
        p.vx = -MOVE_SPEED;
      } else {
        this.log(p, "BLOCK LEFT", "Cannot move LEFT");
      }
    } else if (input.moveRight) {
      p.direction = 'right';
      if (this.canMoveRight(p)) {
        p.vx = MOVE_SPEED;
      } else {
        this.log(p, "BLOCK RIGHT", "Cannot move RIGHT");
      }
    }
  }

  private handleVerticalMovement(p: Player, input: PlayerInput, dt: number): void {

    // STEP 1: Handle jetpack thrust (adds upward force, doesn't override other physics)
    if (p.jetpackActive) {
      // Check for ceiling collision before adding thrust
      const headY = p.feetY + 1; // Player head is ~1 tile above feet
      const headTile = this.tileAt(p.feetX, headY);
      
      if (this.isGroundTile(headTile)) {
        // Blocked by ceiling - cannot thrust upward
        this.log(p, "JETPACK BLOCKED", `Ceiling collision at tile ${headTile}`);
      } else if (p.vy < MAX_JETPACK_VELOCITY) {
        const thrustToAdd = Math.min(JETPACK_THRUST, MAX_JETPACK_VELOCITY - p.vy);
        p.vy += thrustToAdd;
        this.log(p, "JETPACK THRUST", `Adding ${thrustToAdd.toFixed(2)} thrust, total vy=${p.vy.toFixed(2)}`);
      }
      // Don't return - let other physics (gravity/movement) still apply
    }

    // STEP 2: Handle state-specific vertical behavior (gravity and base movement)
    if (hasState(p, 'air')) {
      // Pure air state: apply gravity only (gravity pulls down = negative Y)
      p.vy -= GRAVITY * dt;
      // Only log gravity if it's significant to avoid spam
      if (Math.abs(p.vy) > 1) {
        this.log(p, "GRAVITY", `Falling with vy=${p.vy.toFixed(2)}`);
      }
      return;
    }
    
    // For ladder and ground states: no gravity by default (but preserve jetpack thrust)
    if (!p.jetpackActive) {
      p.vy = 0;
    }
    
    // STEP 3: Handle manual vertical movement (unified logic)
    if (input.moveUp && !input.moveDown) {
      if (this.canMoveUp(p)) {
        p.vy = LADDER_SPEED; // Move up = positive Y
      } else {
        this.log(p, "BLOCKED UP", "Cannot move up");
      }
    } else if (input.moveDown && !input.moveUp) {
      if (this.canMoveDown(p)) {
        p.vy = -LADDER_SPEED; // Move down = negative Y
      } else {
        this.log(p, "BLOCKED DOWN", "Cannot move down");
      }
    }
  }

  private classifyPlayerState(p: Player): PlayerState[] {
    const newStates: PlayerState[] = [];
    
    if (this.isPlayerOnGround(p)) {
      newStates.push('ground');
    }
    
    if (this.isPlayerOnLadder(p)) {
      newStates.push('ladder');
    }
    
    // Air state when no ground or ladder
    if (newStates.length === 0) {
      newStates.push('air');
    }
    
    return newStates;
  }

    private updatePlayer(p: Player, input: PlayerInput, dt: number): void {

    // Step 1: Handle jetpack activation/deactivation
    p.jetpackActive = input.jetpack || false;

    // Step 2: Calculate movement vectors
    this.handleHorizontalMovement(p, input);
    this.handleVerticalMovement(p, input, dt);

    // Step 2: Integrate position
    const oldFeetX = p.feetX;
    const oldFeetY = p.feetY;
    const newFeetX = p.feetX + p.vx * dt;
    const newFeetY = p.feetY + p.vy * dt;

    // Step 3: Apply map boundaries (feet must stay within map)
    const minFeetX = MAP_BOUNDARY_OFFSET;  // feet can't go to left edge (center would be at 0)
    const maxFeetX = this.map.width - MAP_BOUNDARY_OFFSET;  // feet can't go to right edge
    const minFeetY = MAP_BOUNDARY_OFFSET;  // feet can't go above top (center would be at 0)
    const maxFeetY = this.map.height;  // feet can touch bottom boundary
    
    p.feetX = Math.max(minFeetX, Math.min(maxFeetX, newFeetX));
    p.feetY = Math.max(minFeetY, Math.min(maxFeetY, newFeetY));

    // Step 4: Classify current state (but preserve boundary ground state)
    setState(p, this.classifyPlayerState(p));
    
    // Log player movement only if position actually changed
    if (Math.abs(p.feetX - oldFeetX) > 0.001 || Math.abs(p.feetY - oldFeetY) > 0.001) {
      const prefix = hasState(p, 'air') ? 'GRAVITY' : 'MOVE';
      this.log(p, prefix, `FEET=(${oldFeetX.toFixed(2)},${oldFeetY.toFixed(2)}) -> FEET=(${p.feetX.toFixed(2)},${p.feetY.toFixed(2)}) vx=${p.vx.toFixed(2)} vy=${p.vy.toFixed(2)}`);
    }
  
    // Step 5: Respawn if hitting boundaries
    if (newFeetY <= minFeetY && p.vy < 0) {
      this.log(p, "BOUNDARY", "Player hit bottom boundary - respawning");
      this.respawnPlayer(p);
      return;
    }

    // Step 6: Continuous collision detection for falling players
    if (hasState(p, 'air') && p.vy < 0) {
      // Check if player crossed through a floor during this movement
      const startY = oldFeetY;
      const endY = p.feetY;
      
      // Find the first floor tile we crossed (going downward)
      let floorHitY: number | null = null;
      
      // Check each integer Y level we might have crossed
      const startTileY = Math.floor(startY);
      const endTileY = Math.floor(endY);
      
      for (let checkY = startTileY; checkY >= endTileY; checkY--) {
        const tile = this.tileAt(p.feetX, checkY);
        if (this.isGroundTile(tile)) {
          // Found a floor tile at this Y level
          // Check if we actually crossed through it
          if (startY > checkY && endY <= checkY) {
            floorHitY = checkY;
            break;
          }
        }
      }
      
      if (floorHitY !== null) {
        // Check for fall damage based on impact velocity, not distance
        const impactVelocity = Math.abs(p.vy); // Downward velocity magnitude
        
        if (impactVelocity > LETHAL_VELOCITY) {
          this.log(p, "LAND", `Player died (impact velocity: ${impactVelocity.toFixed(2)} tiles/sec)`);
          this.killPlayer(p.id);
          return;
        }

        // Stop at the floor surface
        p.feetY = floorHitY;
        p.vy = 0;
        setState(p, ['ground']);

        this.log(p, "LAND", `Player landed safely at Y=${floorHitY}`);
      }
    }

    // Step 7: Handle shooting
    if (input.fire && Date.now() >= p.canFireAt) {
      this.createProjectile(p);
      p.canFireAt = Date.now() + (1000 / CONSTANTS.fireRatePerSec);
    }
  }

  private createProjectile(player: Player): void {
    const id = nanoid();
    const direction = player.direction === 'left' ? -1 : 1;
    
    const projectile: Projectile = {
      id,
      feetX: player.feetX + (direction * 0.6), // Spawn slightly ahead of player
      feetY: player.feetY - 0.3, // Spawn at chest level
      vx: direction * CONSTANTS.speeds.projectile,
      vy: 0,
      ownerId: player.id,
      createdAt: Date.now(),
    };

    this.projectiles.set(id, projectile);
    this.log(player, "FIRE", `Shot projectile ${direction > 0 ? 'right' : 'left'}`);
  }

  private updateProjectiles(dt: number): void {
    const toRemove: string[] = [];

    for (const [id, projectile] of this.projectiles) {
      projectile.feetX += projectile.vx * dt;
      projectile.feetY += projectile.vy * dt;

      // Check map boundaries
      if (projectile.feetX < 0 || projectile.feetX > this.map.width || 
          projectile.feetY < 0 || projectile.feetY > this.map.height) {
        toRemove.push(id);
        continue;
      }

      // Check player collisions (exclude owner)
      for (const [playerId, player] of this.players) {
        if (playerId === projectile.ownerId) continue;

        const dx = Math.abs(player.feetX - projectile.feetX);
        const dy = Math.abs((player.feetY - TILE_CENTER_OFFSET) - projectile.feetY); // Player center vs projectile
        
        if (dx < HIT_DETECTION_RADIUS && dy < HIT_DETECTION_RADIUS) {
          this.hitPlayer(player, projectile);
          toRemove.push(id);
          break;
        }
      }

      // Remove old projectiles (3 second lifetime for faster bullets)
      if (Date.now() - projectile.createdAt > 3000) {
        toRemove.push(id);
      }
    }

    // Remove marked projectiles
    for (const id of toRemove) {
      this.projectiles.delete(id);
    }
  }

  private hitPlayer(player: Player, projectile: Projectile): void {
    // Skip if player has spawn protection
    if (Date.now() < player.spawnProtectedUntil) {
      return;
    }

    player.hp -= PROJECTILE_DAMAGE;
    const shooter = this.players.get(projectile.ownerId);
    
    this.log(player, "HIT", `Hit by projectile, HP: ${player.hp}`);

    if (player.hp <= 0) {
      if (shooter) {
        shooter.frags++;
        this.log(shooter, "FRAG", `Killed ${player.name}`);
      }
      this.killPlayer(player.id);
    }
  }

  private findSpawnLocation(): { feetX: number; feetY: number } {
    for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
      const x = Math.floor(Math.random() * this.map.width);
      const y = Math.floor(Math.random() * this.map.height);
      
      const floorTile = this.tileAt(x + TILE_CENTER_OFFSET, y);
      
      if (this.isGroundTile(floorTile)) {
        return { feetX: x + TILE_CENTER_OFFSET, feetY: y };
      }
    }
    
    // Fallback to map center - feet at safe position
    return { feetX: this.map.width / 2, feetY: this.map.height / 2 };
  }

  private respawnPlayer(player: Player): void {
    const spawn = this.findSpawnLocation();
    player.feetX = spawn.feetX;
    player.feetY = spawn.feetY;
    player.vx = 0;
    player.vy = 0;
    player.hp = INITIAL_HP;
    player.spawnProtectedUntil = Date.now() + CONSTANTS.spawnProtectionMs;
    player.states = ['ground'];
    
    // Classify respawn state based on new position topology
    setState(player, this.classifyPlayerState(player));
    
    this.log(player, "RESPAWN", `Player respawned (boundary hit)`);
  }

  private killPlayer(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    this.respawnPlayer(p);
  }

  addPlayer(name: string): Player {
    const id = nanoid();
    const spawn = this.findSpawnLocation();
    const colorIndex = this.getNextAvailableColorIndex();
    const player: Player = {
      id,
      name,
      feetX: spawn.feetX,
      feetY: spawn.feetY,
      vx: 0,
      vy: 0,
      hp: INITIAL_HP,
      frags: 0,
      states: ['air'], // Will be classified correctly on first update
      spawnProtectedUntil: Date.now() + CONSTANTS.spawnProtectionMs,
      canFireAt: 0,
      direction: 'right', // Default direction
      colorIndex,
      jetpackActive: false,
    };

    // Classify initial state based on spawn position topology
    setState(player, this.classifyPlayerState(player));

    this.log(player, "SPAWN", `Player ${id} spawned`);

    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      this.releaseColorIndex(player.colorIndex);
    }
    this.players.delete(id);
    this.inputs.delete(id);
  }

  setInput(id: string, input: PlayerInput): void {
    this.inputs.set(id, input);
  }

  tick(): void {
    const now = Date.now();
    const dt = this.lastTickAt ? (now - this.lastTickAt) / 1000 : 0;
    this.lastTickAt = now;

    for (const p of this.players.values()) {
      const input = this.inputs.get(p.id) || {};
      this.updatePlayer(p, input, dt);
    }

    this.updateProjectiles(dt);
  }

  start(): void {
    const stepMs = Math.round(1000 / CONSTANTS.tickHz);
    this.lastTickAt = Date.now();
    setInterval(() => {
      this.tick();
    }, stepMs);
  }

  snapshot(): SnapshotMessage {
    return {
      type: 'snapshot',
      serverTick: Date.now(),
      players: Array.from(this.players.values()).map(p => {
        return {
          id: p.id,
          feetX: p.feetX,
          feetY: p.feetY,
          hp: p.hp,
          frags: p.frags,
          state: p.states[0] || 'air', // Send primary state for client compatibility
          spawnProtected: Date.now() < p.spawnProtectedUntil,
          direction: p.direction,
          colorIndex: p.colorIndex,
          jetpackActive: p.jetpackActive,
        };
      }),
      projectiles: Array.from(this.projectiles.values()).map(p => ({
        id: p.id,
        feetX: p.feetX,
        feetY: p.feetY,
        vx: p.vx,
        vy: p.vy,
        ownerId: p.ownerId,
      }))
    };
  }
}
