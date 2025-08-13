export type TileChar = '.' | '#' | 'H' | '_' | 'U' | 'X';

export const TILE = {
  EMPTY: '.',
  FLOOR: '#',
  LADDER: 'H',
  LADDER_TOP: '_',
  LADDER_UP: 'U',
  LADDER_CROSS: 'X',
} as const satisfies Record<string, TileChar>;

export type MapData = {
  width: number;
  height: number;
  tiles: string[]; // array of lines, each of length width
};

export function isTileChar(c: string): c is TileChar {
  return c === '.' || c === '#' || c === 'H' || c === '_' || c === 'U' || c === 'X';
}

export function getTile(map: MapData, x: number, y: number): TileChar | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return map.tiles[y][x] as TileChar;
}

// Variant resolver for rendering (client-side use)
export type TileVariant = 'empty' | 'floor' | 'ladder' | 'ladder-top' | 'ladder-up' | 'ladder-cross';

export function resolveTileVariant(map: MapData, x: number, y: number): TileVariant {
  const t = getTile(map, x, y);
  if (t === null) return 'empty';
  
  switch (t) {
    case TILE.EMPTY: return 'empty';
    case TILE.FLOOR: return 'floor';
    case TILE.LADDER: return 'ladder';
    case TILE.LADDER_TOP: return 'ladder-top';
    case TILE.LADDER_UP: return 'ladder-up';
    case TILE.LADDER_CROSS: return 'ladder-cross';
    default: return 'empty';
  }
}

