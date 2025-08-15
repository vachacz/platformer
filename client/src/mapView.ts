import { Graphics, Container } from 'pixi.js';
import type { MapData } from '@game/shared';
import { resolveTileVariant } from '@game/shared';

export function renderMap(map: MapData): Container {
  const root = new Container();
  const tileSize = 32;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const variant = resolveTileVariant(map, x, y);
      if (variant === 'empty') continue;
      const g = new Graphics();

      // Server Y=0 is bottom, but PIXI Y=0 is top
      // So we need to flip Y coordinates for rendering
      const clientY = (map.height - 1 - y) * tileSize;

      // Floor variants: regular floor, ladder-top, ladder-up, ladder-cross
      if (variant === 'floor' || variant === 'ladder-top' || variant === 'ladder-up' || variant === 'ladder-cross') {
        // Draw floor bar at bottom
        g.rect(x * tileSize, clientY + (tileSize - 6), tileSize, 6).fill(0x3b3b3b);
        g.rect(x * tileSize, clientY + (tileSize - 6), tileSize, 1).fill(0x555555);
        g.rect(x * tileSize, clientY + (tileSize - 1), tileSize, 1).fill(0x2a2a2a);
        
        // Add ladder rails for ladder-top (can go down)
        if (variant === 'ladder-top') {
          g.rect(x * tileSize + 7, clientY + 22, 4, 3).fill(0xa8712a);
          g.rect(x * tileSize + 21, clientY + 22, 4, 3).fill(0xa8712a);
          g.rect(x * tileSize + 7, clientY + 24, 4, 1).fill(0x7a521f);
          g.rect(x * tileSize + 21, clientY + 24, 4, 1).fill(0x7a521f);
        }
        
        // Add ladder elements for ladder-up (U) - like ladder-bottom but shorter
        if (variant === 'ladder-up') {
          // Vertical rails (shorter, don't go to floor)
          const railHeight = tileSize - 12; // stop before floor
          g.rect(x * tileSize + 7, clientY, 4, railHeight + 2).fill(0xa8712a);
          g.rect(x * tileSize + 21, clientY, 4, railHeight + 2).fill(0xa8712a);
          // Rungs (precise, even spacing)
          const rungSpacing = 4;
          const rungHeight = 1;
          for (let sy = 3; sy <= railHeight - 1; sy += rungSpacing) {
            g.rect(x * tileSize + 7, clientY + sy - 2, 18, rungHeight).fill(0xd9a066);
          }
        }
        
        // Add ladder elements for ladder-cross (X) - full ladder height
        if (variant === 'ladder-cross') {
          // Vertical rails (full height, go through floor)
          g.rect(x * tileSize + 7, clientY, 4, tileSize - 6).fill(0xa8712a);
          g.rect(x * tileSize + 21, clientY, 4, tileSize - 6).fill(0xa8712a);
          // Rungs (precise, even spacing)
          const rungSpacing = 4;
          const rungHeight = 1;
          for (let sy = 1; sy <= tileSize - 8; sy += rungSpacing) {
            g.rect(x * tileSize + 7, clientY + sy, 18, rungHeight).fill(0xd9a066);
          }
        }
      } 
      // Pure ladder (H) - only vertical rails
      else if (variant === 'ladder') {
        // Extend ladder to connect better with adjacent tiles
        const ladderHeight = tileSize + 4; // slightly longer than tile
        const ladderY = clientY - 2; // start slightly above
        
        // Vertical rails
        g.rect(x * tileSize + 7, ladderY, 4, ladderHeight - 1).fill(0xa8712a);
        g.rect(x * tileSize + 21, ladderY, 4, ladderHeight - 1).fill(0xa8712a);
        // Rungs (precise, even spacing)
        const rungSpacing = 4;
        const rungHeight = 1;
        for (let sy = 3; sy <= ladderHeight - 5; sy += rungSpacing) {
          g.rect(x * tileSize + 7, ladderY + sy, 18, rungHeight).fill(0xd9a066);
        }
      }
      
      root.addChild(g);
    }
  }
  return root;
}

