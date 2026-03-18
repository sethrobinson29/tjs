export interface Piece {
  shape: number[][][];  // 4 rotation states, each a 2D matrix
  color: number;        // Phaser hex color (0xRRGGBB)
  colorStr: string;     // CSS hex string for glow
  colorCB: number;      // Colorblind-safe color (Wong palette)
  colorStrCB: string;
}

// Each rotation state: 1 = filled, 0 = empty
// Stored as [row][col]
export const PIECES: Piece[] = [
  // I-piece — electric blue / CB: sky blue
  {
    color: 0x00d4ff,
    colorStr: '#00d4ff',
    colorCB: 0x56b4e9,
    colorStrCB: '#56b4e9',
    shape: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
  },

  // O-piece — yellow-green / CB: yellow
  {
    color: 0xd4ff00,
    colorStr: '#d4ff00',
    colorCB: 0xf0e442,
    colorStrCB: '#f0e442',
    shape: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
  },

  // T-piece — violet / CB: reddish purple
  {
    color: 0xbf00ff,
    colorStr: '#bf00ff',
    colorCB: 0xcc79a7,
    colorStrCB: '#cc79a7',
    shape: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
  },

  // S-piece — acid green / CB: bluish green
  {
    color: 0x39ff14,
    colorStr: '#39ff14',
    colorCB: 0x009e73,
    colorStrCB: '#009e73',
    shape: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
  },

  // Z-piece — hot pink / CB: vermilion
  {
    color: 0xff2d78,
    colorStr: '#ff2d78',
    colorCB: 0xd55e00,
    colorStrCB: '#d55e00',
    shape: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
  },

  // J-piece — orange / CB: blue
  {
    color: 0xff6b00,
    colorStr: '#ff6b00',
    colorCB: 0x0072b2,
    colorStrCB: '#0072b2',
    shape: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
  },

  // L-piece — cyan / CB: orange
  {
    color: 0x00ffcc,
    colorStr: '#00ffcc',
    colorCB: 0xe69f00,
    colorStrCB: '#e69f00',
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
