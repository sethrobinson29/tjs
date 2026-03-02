export interface Piece {
  shape: number[][][];  // 4 rotation states, each a 2D matrix
  color: number;        // Phaser hex color (0xRRGGBB)
  colorStr: string;     // CSS hex string for glow
}

// Each rotation state: 1 = filled, 0 = empty
// Stored as [row][col]
export const PIECES: Piece[] = [
  // I-piece — electric blue
  {
    color: 0x00d4ff,
    colorStr: '#00d4ff',
    shape: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
  },

  // O-piece — yellow-green
  {
    color: 0xd4ff00,
    colorStr: '#d4ff00',
    shape: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
  },

  // T-piece — violet
  {
    color: 0xbf00ff,
    colorStr: '#bf00ff',
    shape: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
  },

  // S-piece — acid green
  {
    color: 0x39ff14,
    colorStr: '#39ff14',
    shape: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
  },

  // Z-piece — hot pink
  {
    color: 0xff2d78,
    colorStr: '#ff2d78',
    shape: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
  },

  // J-piece — orange
  {
    color: 0xff6b00,
    colorStr: '#ff6b00',
    shape: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
  },

  // L-piece — cyan
  {
    color: 0x00ffcc,
    colorStr: '#00ffcc',
    shape: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
  },
];

export function randomPiece(): number {
  return Math.floor(Math.random() * PIECES.length);
}
