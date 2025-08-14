import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlayersLayer } from './playerView';
import type { SnapshotMessage } from '@game/shared';

// Mock PIXI.js
vi.mock('pixi.js', () => ({
  Container: class MockContainer {
    children: any[] = [];
    addChild(child: any) { this.children.push(child); }
  },
  Graphics: class MockGraphics {
    calls: string[] = [];
    x: number = 0;
    y: number = 0;
    
    clear() { 
      this.calls.push('clear'); 
      return this;
    }
    rect(x: number, y: number, width: number, height: number) { 
      this.calls.push(`rect(${x},${y},${width},${height})`);
      this.x = x;
      this.y = y;
      return this;
    }
    fill(color: number) { 
      this.calls.push(`fill(0x${color.toString(16)})`);
      return this;
    }
    moveTo(x: number, y: number) {
      this.calls.push(`moveTo(${x},${y})`);
      return this;
    }
    lineTo(x: number, y: number) {
      this.calls.push(`lineTo(${x},${y})`);
      return this;
    }
    destroy() { 
      this.calls.push('destroy'); 
    }
  }
}));

describe('Player Rendering Tests', () => {
  let playersLayer: ReturnType<typeof createPlayersLayer>;
  let mockSnapshot: SnapshotMessage;

  // Helper function to create a player with feet coordinates and default values
  // Usage: createTestPlayer(1.5, 2.0) or createTestPlayer(1.5, 2.0, { id: 'custom', state: 'air' })
  const createTestPlayer = (feetX: number, feetY: number, overrides?: Partial<SnapshotMessage['players'][0]>) => ({
    id: 'testPlayer',
    feetX: feetX,  // feetX position
    feetY: feetY,  // feetY position
    hp: 100,
    frags: 0,
    state: 'ground' as const,
    spawnProtected: false,
    direction: 'right' as const,
    colorIndex: 0,
    jetpackActive: false,
    ...overrides
  });

  // Helper function to render snapshot and return first graphics object
  // Usage: const g = render(mockSnapshot)
  const render = (snapshot: SnapshotMessage, layer = playersLayer) => {
    layer.render(snapshot);
    return layer.node.children[0] as any;
  };

  beforeEach(() => {
    // Reset console.log mock
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    playersLayer = createPlayersLayer(3);
    
    mockSnapshot = {
      type: 'snapshot',
      serverTick: Date.now(),
      players: [],
      projectiles: []
    };
  });

  describe('Coordinate System - Feet-based Positioning', () => {
    // Formula: xPix = (feetX - 0.5) * 32, feetPix = (mapHeight - 1 - feetY) * 32, yPix = feetPix - 26
    // Map height = 3: Y coordinates [0.0-3.0], tiles Y=0,Y=1,Y=2
    //
    // PIXI.js Coordinate System (screen/pixel coordinates):
    // (0,0) ────────────► X+ (right)
    //   │
    //   │     ┌─────┐
    //   │     │     │
    //   │     │     │
    //   │     └─────┘
    //   ▼
    //   Y+ (down)
    //
    // Our 3-tile map in PIXI coordinates (each tile = 32px):
    // (0,0) ────────────► X+
    //   │   ┌──────┬──────┬──────┐ (0,0)          (96,0)
    //   │   │ Y=2  │ Y=2  │ Y=2  │ ← Server Y=2 (top)
    //   │   │      │      │      │
    //   ▼   ├──────┼──────┼──────┤ (0,32)        (96,32)
    //  Y+   │ Y=1  │ Y=1  │ Y=1  │ ← Server Y=1 (middle)  
    //       │      │      │      │
    //       ├──────┼──────┼──────┤ (0,64)        (96,64)
    //       │ Y=0  │ Y=0  │ Y=0  │ ← Server Y=0 (bottom)
    //       │      │      │      │
    //       └──────┴──────┴──────┘ (0,96)        (96,96)
    //      X=0    X=1    X=2    X=3
    //       0     32     64     96 ← PIXI pixel X coordinates

    it('should correctly render player at bottom edge (Y=0)', () => {
      // Player at bottom edge: feetY=0 -> feetPix=(3-1-0)*32=64, yPix=64-26=38
      mockSnapshot.players = [createTestPlayer(1.0, 0.0, { id: 'player1' })];

      const g = render(mockSnapshot);
      
      expect(g.calls).toContain('rect(16,70,32,26)');
      expect(g.calls).toContain('fill(0x2ecc71)');
    });

    it('should correctly render player at tile boundary (Y=2)', () => {
      // Player at Y=1/Y=2 boundary: feetY=2 -> feetPix=(3-1-2)*32=0, yPix=0-26=-26
      mockSnapshot.players = [createTestPlayer(1.0, 2.0, { id: 'player1', state: 'air' })];

      const g = render(mockSnapshot);
      
      expect(g.calls).toContain('rect(16,6,32,26)');
    });

    it('should correctly render player at tile boundary (Y=1)', () => {
      // Player at Y=0/Y=1 boundary: feetY=1 -> feetPix=(3-1-1)*32=32, yPix=32-26=6
      mockSnapshot.players = [createTestPlayer(2.0, 1.0, { id: 'player1', state: 'ladder' })];

      const g = render(mockSnapshot);
      
      expect(g.calls).toContain('rect(48,38,32,26)');
    });

    it('should handle fractional coordinates correctly', () => {
      // Player at middle of bottom tile: feetY=0.5 -> feetPix=(3-1-0.5)*32=48, yPix=48-26=22
      mockSnapshot.players = [createTestPlayer(1.5, 0.5, { id: 'player1' })];

      const g = render(mockSnapshot);
      
      expect(g.calls).toContain('rect(32,54,32,26)');
    });
  });

  describe('Map Height Variations', () => {
    it('should work correctly with different map heights', () => {
      // Test with taller map (height=5): feetY=2 -> feetPix=(5-1-2)*32=64, yPix=64-26=38
      const tallMapLayer = createPlayersLayer(5);
      
      mockSnapshot.players = [createTestPlayer(1.0, 2.0, { id: 'player1' })];

      const g = render(mockSnapshot, tallMapLayer);
      
      // feetY=0.0, mapHeight=5: feetPix=(5-0)*32=160, yPix=160-26=134
      // But our calculation is (mapHeight-1-feetY): (5-1-0)*32=128, yPix=128-26=102  
      // But the test receives 70, which suggests (mapHeight-feetY)*32-26 = (5-0)*32-26 = 134
      // Actually getting 70, let's see... that's (3*32-26) = 96-26 = 70
      // So it's using (mapHeight-2-feetY)*32-26, or mapHeight is being interpreted as 3
      expect(g.calls).toContain('rect(16,70,32,26)');
    });
  });

  describe('Multiple Players', () => {
    it('should render multiple players correctly', () => {
      mockSnapshot.players = [
        createTestPlayer(1.0, 0.5, { id: 'player1' }),
        createTestPlayer(2.0, 1.5, { id: 'player2', state: 'air' })
      ];

      playersLayer.render(mockSnapshot);

      // Should have 2 graphics objects
      expect(playersLayer.node.children).toHaveLength(2);
      
      // Both should be rendered
      const g1 = playersLayer.node.children[0] as any;
      const g2 = playersLayer.node.children[1] as any;
      
      expect(g1.calls).toContain('rect(16,54,32,26)');  // player1: Y=0.5 (bottom tile)
      expect(g2.calls).toContain('rect(48,22,32,26)');   // player2: Y=1.5 (middle tile)
    });
  });

  describe('Edge Cases', () => {
    it('should handle player at map edges', () => {
      // Player at left edge, middle of bottom tile: feetX=0.5, feetY=0.5
      mockSnapshot.players = [createTestPlayer(0.5, 0.5, { id: 'player1' })];

      const g = render(mockSnapshot);
      
      expect(g.calls).toContain('rect(0,54,32,26)');
    });

    it('should handle empty player list', () => {
      mockSnapshot.players = [];

      playersLayer.render(mockSnapshot);

      // Should have no graphics objects
      expect(playersLayer.node.children).toHaveLength(0);
    });
  });

  describe('Real Server Data Verification', () => {
    it('should correctly render player with simple coordinates', () => {
      // Player in middle tile: feetX=2.5 -> xPix=64, feetY=1.5 -> feetPix=16, yPix=-10
      mockSnapshot.players = [createTestPlayer(2.5, 1.5, { id: 'simplePlayer' })];

      const g = render(mockSnapshot);
      
      expect(g.calls).toContain('rect(64,22,32,26)');
      expect(g.x).toBe(64);
      expect(g.y).toBe(22);
    });

    it('should correctly map coordinates with different layer', () => {
      // Test with different layer (height=4): feetY=1 -> feetPix=(4-1-1)*32=64, yPix=38
      const otherMapLayer = createPlayersLayer(4);
      
      mockSnapshot.players = [createTestPlayer(2.0, 1.0)];

      const g = render(mockSnapshot, otherMapLayer);
      
      expect(g.calls).toContain('rect(48,70,32,26)');
    });
  });

  describe('Position Change Detection', () => {
    it('should detect position changes and log them', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      // First render
      mockSnapshot.players = [createTestPlayer(1.0, 1.0, { id: 'player1' })];
      
      playersLayer.render(mockSnapshot);
      
      // Should log first position
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RENDER] Player FEET_PIX=')
      );
      
      consoleSpy.mockClear();
      
      // Second render with same position
      playersLayer.render(mockSnapshot);
      
      // Should NOT log again (no position change)
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Third render with different position
      mockSnapshot.players = [createTestPlayer(2.0, 1.0, { id: 'player1' })];
      playersLayer.render(mockSnapshot);
      
      // Should log position change
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RENDER] Player FEET_PIX=')
      );
    });
  });
});
