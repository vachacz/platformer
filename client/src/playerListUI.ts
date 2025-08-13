import { Container, Graphics } from 'pixi.js';
import type { SnapshotMessage } from '@game/shared';
import { PLAYER_COLORS } from '@game/shared';

export function createPlayerListUI(): { node: Container; update(snap: SnapshotMessage): void } {
  const node = new Container();
  node.x = 10; // Right side margin
  node.y = 10; // Top margin
  
  const playerEntries = new Map<string, { container: Container; healthBar: Graphics; colorIndicator: Graphics }>();

  function update(snap: SnapshotMessage) {
    // Clean up old entries
    const currentPlayerIds = new Set(snap.players.map(p => p.id));
    for (const [id, entry] of playerEntries) {
      if (!currentPlayerIds.has(id)) {
        node.removeChild(entry.container);
        playerEntries.delete(id);
      }
    }

    // Update or create entries
    snap.players.forEach((player, index) => {
      let entry = playerEntries.get(player.id);
      
      if (!entry) {
        // Create new entry
        const container = new Container();
        const playerColor = PLAYER_COLORS[player.colorIndex] || PLAYER_COLORS[0];
        
        // Player color indicator (square aligned with health bar)
        const colorIndicator = new Graphics();
        colorIndicator.rect(0, 0, 16, 16).fill(playerColor);
        container.addChild(colorIndicator);
        
        // Health bar white border
        const healthBorder = new Graphics();
        healthBorder.rect(24, 0, 82, 16).stroke({ color: 0xffffff, width: 1 });
        container.addChild(healthBorder);
        
        // Health bar gray background
        const healthBg = new Graphics();
        healthBg.rect(25, 1, 80, 14).fill(0x666666);
        container.addChild(healthBg);
        
        // Health bar foreground
        const healthBar = new Graphics();
        container.addChild(healthBar);
        
        // Position the entry
        container.y = index * 22; // Reduced spacing since no text
        node.addChild(container);
        
        entry = { container, healthBar, colorIndicator };
        playerEntries.set(player.id, entry);
      }
      
      // Update entry position (in case order changed)
      entry.container.y = index * 22;
      
      // Update player color (in case colorIndex changed)
      const playerColor = PLAYER_COLORS[player.colorIndex] || PLAYER_COLORS[0];
      entry.colorIndicator.clear();
      entry.colorIndicator.rect(0, 0, 16, 16).fill(playerColor);
      
      // Update health bar
      const healthPercent = Math.max(0, player.hp) / 100;
      entry.healthBar.clear();
      
      // Choose health bar color based on HP
      let healthColor = 0x2ecc71; // Green
      if (healthPercent < 0.5) healthColor = 0xf39c12; // Orange
      if (healthPercent < 0.25) healthColor = 0xe74c3c; // Red
      
      entry.healthBar.rect(25, 1, 80 * healthPercent, 14).fill(healthColor);
      
      // Add spawn protection indicator (golden border around color indicator)
      if (player.spawnProtected) {
        entry.colorIndicator.rect(-1, -1, 18, 18).stroke({ color: 0xf1c40f, width: 2 });
      }
    });
  }

  return { node, update };
}
