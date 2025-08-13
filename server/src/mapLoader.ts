import fs from 'node:fs';
import { type MapData, isTileChar, TILE } from '@game/shared';

export function loadMapFromFile(filePath: string): MapData {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error('Empty map');
  const width = lines[0].length;
  for (const line of lines) {
    if (line.length !== width) throw new Error('Inconsistent map width');
    for (const c of line) {
      if (!isTileChar(c)) throw new Error(`Invalid tile character: '${c}'`);
    }
  }

  // Reverse lines so Y=0 (bottom) corresponds to last line in file
  // and Y=height-1 (top) corresponds to first line in file
  const map: MapData = { width, height: lines.length, tiles: lines.reverse() };
  // Borders are enforced by game logic, not by the file. No border validation here.

  // Basic validation for new tile system - much simpler
  // With new tiles (_, U, X), we don't need complex ladder validation
  // The new system is self-describing through explicit tile types

  return map;
}

// No path helper here; resolve in caller relative to monorepo root

