export const COLS = 10;
export const ROWS = 20;
export const CELL = 30;

export const BOARD_X = 10;
export const BOARD_Y = 10;
export const SIDEBAR_X = BOARD_X + COLS * CELL + 20;

export const CANVAS_WIDTH = BOARD_X + COLS * CELL + 170;
export const CANVAS_HEIGHT = BOARD_Y + ROWS * CELL + 10;

export const GRAVITY_BASE = 800;   // ms per tick at level 1
export const GRAVITY_MIN = 80;     // ms per tick at max speed

export const LINES_PER_LEVEL = 10;

// Base score by number of lines cleared simultaneously (index = line count)
export const SCORE_TABLE = [0, 100, 300, 500, 800];

export const BG_COLOR = 0x0a0a0f;
export const GRID_COLOR = 0x1a1a2e;

// DAS (Delayed Auto Shift) timing in ms
export const DAS_DELAY = 170;
export const DAS_REPEAT = 50;
