import { Container, Graphics, Text } from 'pixi.js';
import type { SnapshotMessage } from '@game/shared';
import { PLAYER_COLORS } from '@game/shared';

export function createPlayerListUI(): { node: Container; update(snap: SnapshotMessage): void } {
  const node = new Container();
  node.x = 10; // Right side margin
  node.y = 10; // Top margin
  
  const playerEntries = new Map<string, { container: Container; healthBar: Graphics; nameText: Text; hpText: Text }>();

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
        
        // Player color indicator (small square)
        const colorIndicator = new Graphics();
        colorIndicator.rect(0, 0, 16, 16).fill(playerColor);
        container.addChild(colorIndicator);
        
        // Player name text
        const nameText = new Text({
          text: `Player ${player.id.slice(-4)}`,
          style: {
            fontSize: 12,
            fill: 0xffffff,
            fontFamily: 'Arial',
          }
        });
        nameText.x = 20;
        nameText.y = 0;
        container.addChild(nameText);
        
        // Health bar background
        const healthBg = new Graphics();
        healthBg.rect(20, 18, 80, 8).fill(0x333333);
        container.addChild(healthBg);
        
        // Health bar foreground
        const healthBar = new Graphics();
        container.addChild(healthBar);
        
        // HP text
        const hpText = new Text({
          text: '100/100',
          style: {
            fontSize: 10,
            fill: 0xffffff,
            fontFamily: 'Arial',
          }
        });
        hpText.x = 105;
        hpText.y = 16;
        container.addChild(hpText);
        
        // Position the entry
        container.y = index * 35;
        node.addChild(container);
        
        entry = { container, healthBar, nameText, hpText };
        playerEntries.set(player.id, entry);
      }
      
      // Update entry position (in case order changed)
      entry.container.y = index * 35;
      
      // Update health bar
      const healthPercent = Math.max(0, player.hp) / 100;
      entry.healthBar.clear();
      
      // Choose health bar color based on HP
      let healthColor = 0x2ecc71; // Green
      if (healthPercent < 0.5) healthColor = 0xf39c12; // Orange
      if (healthPercent < 0.25) healthColor = 0xe74c3c; // Red
      
      entry.healthBar.rect(20, 18, 80 * healthPercent, 8).fill(healthColor);
      
      // Update HP text
      entry.hpText.text = `${Math.max(0, player.hp)}/100`;
      
      // Update name with frags if any
      const fragText = player.frags > 0 ? ` (${player.frags})` : '';
      entry.nameText.text = `Player ${player.id.slice(-4)}${fragText}`;
      
      // Highlight if spawn protected
      if (player.spawnProtected) {
        entry.nameText.style.fill = 0xf1c40f; // Yellow when protected
      } else {
        entry.nameText.style.fill = 0xffffff; // White normally
      }
    });
  }

  return { node, update };
}
