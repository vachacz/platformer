import { Container, Graphics } from 'pixi.js';
import type { SnapshotMessage } from '@game/shared';

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
      // Server now sends p.y as feet position directly
      const feetY = p.y;
      
      xPix = Math.round((p.x - 0.5) * 32); // feet to center for sprite positioning
      
      // Always use consistent positioning based on actual feet position
      // This prevents jumps between ground and ladder states
      // Map server Y to client Y: server bottom=0 -> client bottom=mapHeight-1
      const feetPix = (mapHeight - feetY) * 32;
      yPix = Math.round(feetPix - 26);
      
      // Debug: log render position changes
      const lastPos = lastPositions.get(p.id);
      const posChanged = !lastPos || 
                        Math.abs(lastPos.x - p.x) > 0.001 || 
                        Math.abs(lastPos.y - p.y) > 0.001 || 
                        lastPos.state !== p.state;
      
      if (posChanged) {
        const feetPixX = xPix + 16;   // feet center
        const feetPixY = yPix + 26;   // feet bottom
        
        console.log(`[RENDER] Player FEET_PIX=(${feetPixX},${feetPixY}) | SERVER FEET=(${p.x.toFixed(2)},${feetY.toFixed(2)}) | feetPix=${feetPix.toFixed(1)} yPix=${yPix} mapHeight=${mapHeight} state=${p.state} | calc: (${mapHeight}-1-${feetY.toFixed(1)})*32=${((mapHeight-1-feetY)*32).toFixed(1)}`);
        
        lastPositions.set(p.id, { x: p.x, y: p.y, state: p.state });
      }
      
      // Draw player sprite
      g.rect(xPix, yPix, 32, 26).fill(0x2ecc71);
      
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
