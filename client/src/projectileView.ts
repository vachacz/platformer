import { Container, Graphics } from 'pixi.js';
import type { SnapshotMessage } from '@game/shared';

export function createProjectilesLayer(mapHeight: number): { node: Container; render(snap: SnapshotMessage): void } {
  const node = new Container();
  const byId = new Map<string, Graphics>();

  function render(snap: SnapshotMessage) {
    // Simple reconcile: ensure graphics for all projectiles
    const seen = new Set<string>();
    
    for (const projectile of snap.projectiles) {
      seen.add(projectile.id);
      let g = byId.get(projectile.id);
      if (!g) {
        g = new Graphics();
        byId.set(projectile.id, g);
        node.addChild(g);
      }
      
      g.clear();
      
      // Convert server coordinates (feet-based, Y-up) to client pixels (Y-down)
      const pixelX = Math.round((projectile.feetX - 0.1) * 32); // projectile is 6px wide 
      const pixelY = Math.round(((mapHeight - projectile.feetY) * 32) - 3); // projectile is 6px tall
      
      // Draw projectile as a small yellow circle/rectangle
      g.rect(pixelX, pixelY, 6, 6).fill(0xffff00); // Bright yellow bullet
      
      // Add a slight glow effect
      g.rect(pixelX - 1, pixelY - 1, 8, 8).stroke({ color: 0xffd700, width: 1, alpha: 0.7 });
    }

    // Remove projectiles no longer in snapshot
    for (const [id, g] of byId) {
      if (!seen.has(id)) {
        node.removeChild(g);
        byId.delete(id);
      }
    }
  }

  return { node, render };
}
