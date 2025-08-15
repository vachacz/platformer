import { Container, Graphics } from 'pixi.js';
import type { SnapshotMessage } from '@game/shared';
import { PLAYER_COLORS } from '@game/shared';

export function createPlayersLayer(mapHeight: number): { node: Container; render(snap: SnapshotMessage): void } {
  const node = new Container();
  const byId = new Map<string, Graphics>();
  const lastPositions = new Map<string, { x: number; y: number; state: string }>();

  function render(snap: SnapshotMessage) {

    // Simple reconcile: ensure graphics for all players
    const seen = new Set<string>();
    for (const p of snap.players) {
      seen.add(p.id);
      let g = byId.get(p.id);
      if (!g) {
        g = new Graphics();
        byId.set(p.id, g);
        node.addChild(g);
      }
      g.clear();
      
      // Player sprite is 32x26px
      let xPix: number;
      let yPix: number;
      
      // Calculate consistent positioning for both states
      // Server now sends feetX, feetY directly
      const feetY = p.feetY;
      
      xPix = Math.round((p.feetX - 0.5) * 32); // feet to center for sprite positioning
      
      // Always use consistent positioning based on actual feet position
      // This prevents jumps between ground and ladder states
      // Map server Y to client Y: server bottom=0 -> client bottom=mapHeight-1
      const feetPix = (mapHeight - feetY) * 32;
      yPix = Math.round(feetPix - 26);
      
      // Debug: log render position changes
      const lastPos = lastPositions.get(p.id);
      const posChanged = !lastPos || 
                        Math.abs(lastPos.x - p.feetX) > 0.001 || 
                        Math.abs(lastPos.y - p.feetY) > 0.001 || 
                        lastPos.state !== p.state;
      
      if (posChanged) {
        const feetPixX = xPix + 16;   // feet center
        const feetPixY = yPix + 26;   // feet bottom
        
        console.log(`[RENDER] Player FEET_PIX=(${feetPixX},${feetPixY}) | SERVER FEET=(${p.feetX.toFixed(2)},${feetY.toFixed(2)}) | feetPix=${feetPix.toFixed(1)} yPix=${yPix} mapHeight=${mapHeight} state=${p.state} dir=${p.direction}`);
        
        lastPositions.set(p.id, { x: p.feetX, y: p.feetY, state: p.state });
      }
      
      // Draw player sprite with unique color
      const playerColor = PLAYER_COLORS[p.colorIndex] || PLAYER_COLORS[0];
      
      // Draw pixel art character in profile view with weapon
      if (p.direction === 'right') {
        // Right-facing profile
        // Head (circle, smaller)
        g.circle(xPix + 20, yPix + 6, 5).fill(playerColor);
        
        // Eye (single, facing right)
        g.circle(xPix + 22, yPix + 5, 1).fill(0x000000);
        
        // Body (slimmer profile)
        g.rect(xPix + 15, yPix + 11, 10, 7).fill(playerColor);
        
        // Arms
        g.rect(xPix + 25, yPix + 13, 4, 5).fill(playerColor);  // Front arm (weapon arm)

        // Weapon (rifle/pistol extending from front arm)
        g.rect(xPix + 29, yPix + 14, 6, 2).fill(0x333333);  // Gun barrel
        g.rect(xPix + 26, yPix + 15, 3, 3).fill(0x666666);  // Gun grip
        
        // Legs (shorter, within 26px bounds)
        g.rect(xPix + 16, yPix + 18, 3, 5).fill(playerColor);  // Back leg
        g.rect(xPix + 21, yPix + 18, 3, 5).fill(playerColor);  // Front leg
        
      } else {
        // Left-facing profile  
        // Head (circle, smaller)
        g.circle(xPix + 12, yPix + 6, 5).fill(playerColor);
        
        // Eye (single, facing left)
        g.circle(xPix + 10, yPix + 5, 1).fill(0x000000);
        
        // Body (slimmer profile)
        g.rect(xPix + 7, yPix + 11, 10, 7).fill(playerColor);
        
        // Arms
        g.rect(xPix + 3, yPix + 13, 4, 5).fill(playerColor);   // Front arm (weapon arm)

        // Weapon (rifle/pistol extending from front arm)
        g.rect(xPix - 3, yPix + 14, 6, 2).fill(0x333333);  // Gun barrel
        g.rect(xPix + 3, yPix + 15, 3, 3).fill(0x666666);  // Gun grip
        
        // Legs (shorter, within 26px bounds)
        g.rect(xPix + 8, yPix + 18, 3, 5).fill(playerColor);   // Back leg
        g.rect(xPix + 13, yPix + 18, 3, 5).fill(playerColor);  // Front leg
      }
      
      // Direction is now clear from profile view, no need for arrow
      
      // Draw jetpack thruster effect when active
      if (p.jetpackActive) {
        const thrusterColor = 0xff6b35; // Orange/red flame color
        const flameHeight = 6 + Math.random() * 4; // Variable flame height for flickering
        
        if (p.direction === 'right') {
          // Right-facing jetpack flames from feet (adjusted for new leg positions)
          g.circle(xPix + 17, yPix + 23 + flameHeight/2, 3).fill(thrusterColor);  // Back leg flame
          g.circle(xPix + 22, yPix + 23 + flameHeight/2, 3).fill(thrusterColor);  // Front leg flame
          
          // Inner flame cores (brighter yellow)
          g.circle(xPix + 17, yPix + 23 + flameHeight/3, 1.5).fill(0xffff00);
          g.circle(xPix + 22, yPix + 23 + flameHeight/3, 1.5).fill(0xffff00);
        } else {
          // Left-facing jetpack flames from feet (adjusted for new leg positions)
          g.circle(xPix + 9, yPix + 23 + flameHeight/2, 3).fill(thrusterColor);   // Back leg flame
          g.circle(xPix + 14, yPix + 23 + flameHeight/2, 3).fill(thrusterColor);  // Front leg flame
          
          // Inner flame cores (brighter yellow)
          g.circle(xPix + 9, yPix + 23 + flameHeight/3, 1.5).fill(0xffff00);
          g.circle(xPix + 14, yPix + 23 + flameHeight/3, 1.5).fill(0xffff00);
        }
      }
      
      // Add visual indicator for ladder state
      if (p.state === 'ladder') {
        g.rect(xPix + 14, yPix - 2, 4, 2).fill(0xff0000); // small red dot on ladder
      }
    }
    
    // Remove stale players
    for (const [id, g] of byId) {
      if (!seen.has(id)) {
        g.destroy();
        byId.delete(id);
      }
    }
  }

  return { node, render };
}
