import Phaser from 'phaser';
import {
  COLS, ROWS, CELL,
  BOARD_X, BOARD_Y, SIDEBAR_X,
  CANVAS_WIDTH, CANVAS_HEIGHT,
  GRAVITY_BASE, GRAVITY_MIN,
  LINES_PER_LEVEL,
  SCORE_TABLE,
  DAS_DELAY, DAS_REPEAT,
} from '../constants';
import { PIECES, randomPiece, type Piece } from '../pieces';

// Board cell stores piece index+1 (0 = empty)
type Board = number[][];

interface ActivePiece {
  pieceIndex: number;
  rotation: number;
  x: number;  // board col
  y: number;  // board row
}

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function getMatrix(p: ActivePiece): number[][] {
  return PIECES[p.pieceIndex].shape[p.rotation];
}

function collides(board: Board, p: ActivePiece, dx = 0, dy = 0, rot?: number): boolean {
  const matrix = rot !== undefined
    ? PIECES[p.pieceIndex].shape[rot]
    : getMatrix(p);
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nx = p.x + c + dx;
      const ny = p.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private gfx!: Phaser.GameObjects.Graphics;
  private glowGfx!: Phaser.GameObjects.Graphics;

  private active!: ActivePiece;
  private nextIndex!: number;
  private holdIndex: number = -1;
  private holdUsed: boolean = false;

  private score: number = 0;
  private level: number = 1;
  private lines: number = 0;

  private gravityTimer!: Phaser.Time.TimerEvent;
  private gravityMs: number = GRAVITY_BASE;

  // Sidebar text objects
  private txtScore!: Phaser.GameObjects.Text;
  private txtLevel!: Phaser.GameObjects.Text;
  private txtLines!: Phaser.GameObjects.Text;

  // DAS state
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  private dasLeft: number = 0;
  private dasRight: number = 0;
  private dasDown: number = 0;
  private dasLeftActive: boolean = false;
  private dasRightActive: boolean = false;

  private gameOver: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver = false;
    this.board = emptyBoard();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.holdIndex = -1;
    this.holdUsed = false;

    // Graphics layers: glow behind, main on top
    this.glowGfx = this.add.graphics();
    this.gfx = this.add.graphics();

    this.drawBoardOutline();
    this.buildSidebar();
    this.drawScanlines();

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyZ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyShift = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // One-shot key events for rotate / hold / hard-drop
    this.cursors.up.on('down', () => this.tryRotate());
    this.keyZ.on('down', () => this.tryRotate());
    this.keySpace.on('down', () => this.hardDrop());
    this.keyShift.on('down', () => this.tryHold());

    this.nextIndex = randomPiece();
    this.spawnPiece();
    this.resetGravity();
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;
    this.handleDAS(delta);
  }

  // ─── Gravity ───────────────────────────────────────────────────────────────

  private resetGravity(): void {
    if (this.gravityTimer) this.gravityTimer.remove();
    this.gravityMs = Math.max(GRAVITY_MIN, GRAVITY_BASE - (this.level - 1) * 70);
    this.gravityTimer = this.time.addEvent({
      delay: this.gravityMs,
      callback: this.tick,
      callbackScope: this,
      loop: true,
    });
  }

  private tick(): void {
    if (!collides(this.board, this.active, 0, 1)) {
      this.active.y++;
    } else {
      this.lockPiece();
    }
    this.render();
  }

  // ─── Piece lifecycle ───────────────────────────────────────────────────────

  private spawnPiece(): void {
    const pieceIndex = this.nextIndex;
    this.nextIndex = randomPiece();
    this.holdUsed = false;

    this.active = {
      pieceIndex,
      rotation: 0,
      x: Math.floor(COLS / 2) - Math.floor(PIECES[pieceIndex].shape[0][0].length / 2),
      y: 0,
    };

    if (collides(this.board, this.active)) {
      this.triggerGameOver();
    }
    this.render();
  }

  private lockPiece(): void {
    const matrix = getMatrix(this.active);
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const ny = this.active.y + r;
        const nx = this.active.x + c;
        if (ny >= 0) {
          this.board[ny][nx] = this.active.pieceIndex + 1;
        }
      }
    }
    this.clearLines();
    this.spawnPiece();
  }

  private tryRotate(): void {
    const nextRot = (this.active.rotation + 1) % 4;
    // Basic wall kick: try center, then ±1, ±2
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collides(this.board, this.active, kick, 0, nextRot)) {
        this.active.rotation = nextRot;
        this.active.x += kick;
        this.render();
        return;
      }
    }
  }

  private hardDrop(): void {
    while (!collides(this.board, this.active, 0, 1)) {
      this.active.y++;
    }
    this.lockPiece();
  }

  private tryHold(): void {
    if (this.holdUsed) return;
    this.holdUsed = true;
    const cur = this.active.pieceIndex;
    if (this.holdIndex === -1) {
      this.holdIndex = cur;
      this.spawnPiece();
    } else {
      const prev = this.holdIndex;
      this.holdIndex = cur;
      this.active = {
        pieceIndex: prev,
        rotation: 0,
        x: Math.floor(COLS / 2) - Math.floor(PIECES[prev].shape[0][0].length / 2),
        y: 0,
      };
    }
    this.render();
  }

  // ─── Line clearing ─────────────────────────────────────────────────────────

  private clearLines(): void {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++; // recheck same row index
      }
    }
    if (cleared === 0) return;

    this.lines += cleared;
    this.score += (SCORE_TABLE[cleared] ?? 800) * this.level;
    const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.resetGravity();
    }
    this.updateSidebarText();
  }

  // ─── DAS input ────────────────────────────────────────────────────────────

  private handleDAS(delta: number): void {
    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const down = this.cursors.down.isDown;

    // Left
    if (left && !right) {
      if (!this.dasLeftActive) {
        this.dasLeft = 0;
        this.dasLeftActive = true;
        this.moveActive(-1, 0);
      } else {
        this.dasLeft += delta;
        if (this.dasLeft >= DAS_DELAY) {
          this.dasLeft = DAS_DELAY - DAS_REPEAT;
          this.moveActive(-1, 0);
        }
      }
    } else {
      this.dasLeftActive = false;
      this.dasLeft = 0;
    }

    // Right
    if (right && !left) {
      if (!this.dasRightActive) {
        this.dasRight = 0;
        this.dasRightActive = true;
        this.moveActive(1, 0);
      } else {
        this.dasRight += delta;
        if (this.dasRight >= DAS_DELAY) {
          this.dasRight = DAS_DELAY - DAS_REPEAT;
          this.moveActive(1, 0);
        }
      }
    } else {
      this.dasRightActive = false;
      this.dasRight = 0;
    }

    // Soft drop
    if (down) {
      this.dasDown += delta;
      if (this.dasDown >= 50) {
        this.dasDown = 0;
        if (!collides(this.board, this.active, 0, 1)) {
          this.active.y++;
          this.render();
        }
      }
    } else {
      this.dasDown = 0;
    }
  }

  private moveActive(dx: number, dy: number): void {
    if (!collides(this.board, this.active, dx, dy)) {
      this.active.x += dx;
      this.active.y += dy;
      this.render();
    }
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  private render(): void {
    this.glowGfx.clear();
    this.gfx.clear();

    this.drawBoardOutline();
    this.drawGrid();
    this.drawLockedCells();
    this.drawGhostPiece();
    this.drawActivePiece();
    this.drawNextPiece();
    this.drawHoldPiece();
  }

  private drawBoardOutline(): void {
    this.gfx.lineStyle(1, 0x222244, 1);
    this.gfx.strokeRect(
      BOARD_X - 1,
      BOARD_Y - 1,
      COLS * CELL + 2,
      ROWS * CELL + 2,
    );
  }

  private drawGrid(): void {
    this.gfx.lineStyle(1, 0x111122, 0.4);
    for (let c = 1; c < COLS; c++) {
      this.gfx.lineBetween(
        BOARD_X + c * CELL, BOARD_Y,
        BOARD_X + c * CELL, BOARD_Y + ROWS * CELL,
      );
    }
    for (let r = 1; r < ROWS; r++) {
      this.gfx.lineBetween(
        BOARD_X, BOARD_Y + r * CELL,
        BOARD_X + COLS * CELL, BOARD_Y + r * CELL,
      );
    }
  }

  private drawLockedCells(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = this.board[r][c];
        if (!idx) continue;
        const piece = PIECES[idx - 1];
        this.drawCell(c, r, piece.color, piece.colorStr, 1);
      }
    }
  }

  private drawActivePiece(): void {
    const matrix = getMatrix(this.active);
    const piece = PIECES[this.active.pieceIndex];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        this.drawCell(this.active.x + c, this.active.y + r, piece.color, piece.colorStr, 1);
      }
    }
  }

  private drawGhostPiece(): void {
    const ghost = { ...this.active };
    while (!collides(this.board, ghost, 0, 1)) ghost.y++;
    if (ghost.y === this.active.y) return;

    const matrix = getMatrix(ghost);
    const piece = PIECES[ghost.pieceIndex];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        this.drawCellGhost(ghost.x + c, ghost.y + r, piece.color);
      }
    }
  }

  private drawCell(col: number, row: number, color: number, _colorStr: string, _alpha: number): void {
    const px = BOARD_X + col * CELL;
    const py = BOARD_Y + row * CELL;
    const inset = 2;

    // Glow: slightly larger, blurred look via alpha layers
    this.glowGfx.lineStyle(4, color, 0.15);
    this.glowGfx.strokeRect(px + inset - 2, py + inset - 2, CELL - inset * 2 + 4, CELL - inset * 2 + 4);
    this.glowGfx.lineStyle(2, color, 0.3);
    this.glowGfx.strokeRect(px + inset - 1, py + inset - 1, CELL - inset * 2 + 2, CELL - inset * 2 + 2);

    // Inner subtle fill
    this.gfx.fillStyle(color, 0.08);
    this.gfx.fillRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);

    // Crisp outline
    this.gfx.lineStyle(1.5, color, 1);
    this.gfx.strokeRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);

    // Corner accents
    const cornerSize = 4;
    this.gfx.lineStyle(1.5, color, 1);
    // top-left
    this.gfx.lineBetween(px + inset, py + inset, px + inset + cornerSize, py + inset);
    this.gfx.lineBetween(px + inset, py + inset, px + inset, py + inset + cornerSize);
    // top-right
    this.gfx.lineBetween(px + CELL - inset, py + inset, px + CELL - inset - cornerSize, py + inset);
    this.gfx.lineBetween(px + CELL - inset, py + inset, px + CELL - inset, py + inset + cornerSize);
    // bottom-left
    this.gfx.lineBetween(px + inset, py + CELL - inset, px + inset + cornerSize, py + CELL - inset);
    this.gfx.lineBetween(px + inset, py + CELL - inset, px + inset, py + CELL - inset - cornerSize);
    // bottom-right
    this.gfx.lineBetween(px + CELL - inset, py + CELL - inset, px + CELL - inset - cornerSize, py + CELL - inset);
    this.gfx.lineBetween(px + CELL - inset, py + CELL - inset, px + CELL - inset, py + CELL - inset - cornerSize);
  }

  private drawCellGhost(col: number, row: number, color: number): void {
    const px = BOARD_X + col * CELL;
    const py = BOARD_Y + row * CELL;
    const inset = 2;
    this.gfx.lineStyle(1, color, 0.25);
    this.gfx.strokeRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);
  }

  // ─── Sidebar ───────────────────────────────────────────────────────────────

  private buildSidebar(): void {
    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '13px',
      color: '#555577',
    };
    const valueStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '22px',
      color: '#00d4ff',
      shadow: { offsetX: 0, offsetY: 0, color: '#00d4ff', blur: 8, fill: true },
    };

    const sx = SIDEBAR_X;

    this.add.text(sx, 14, 'SCORE', textStyle);
    this.txtScore = this.add.text(sx, 30, '0', valueStyle);

    this.add.text(sx, 90, 'LEVEL', textStyle);
    this.txtLevel = this.add.text(sx, 106, '1', valueStyle);

    this.add.text(sx, 160, 'LINES', textStyle);
    this.txtLines = this.add.text(sx, 176, '0', valueStyle);

    // Labels for next/hold drawn statically
    this.add.text(sx, 240, 'NEXT', { ...textStyle });
    this.add.text(sx, 360, 'HOLD', { ...textStyle });
  }

  private updateSidebarText(): void {
    this.txtScore.setText(String(this.score));
    this.txtLevel.setText(String(this.level));
    this.txtLines.setText(String(this.lines));
  }

  private drawNextPiece(): void {
    this.drawMiniPiece(this.nextIndex, SIDEBAR_X, 258);
  }

  private drawHoldPiece(): void {
    if (this.holdIndex === -1) return;
    this.drawMiniPiece(this.holdIndex, SIDEBAR_X, 378);
  }

  private drawMiniPiece(index: number, sx: number, sy: number): void {
    const piece: Piece = PIECES[index];
    const matrix = piece.shape[0];
    const miniCell = 16;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const px = sx + c * miniCell;
        const py = sy + r * miniCell;
        this.gfx.lineStyle(1, piece.color, 1);
        this.gfx.strokeRect(px, py, miniCell - 1, miniCell - 1);
        this.gfx.fillStyle(piece.color, 0.1);
        this.gfx.fillRect(px, py, miniCell - 1, miniCell - 1);
      }
    }
  }

  // ─── Scanlines ────────────────────────────────────────────────────────────

  private drawScanlines(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.04);
    for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
      overlay.fillRect(0, y, CANVAS_WIDTH, 1);
    }
    overlay.setDepth(100);
  }

  // ─── Game over ─────────────────────────────────────────────────────────────

  private triggerGameOver(): void {
    this.gameOver = true;
    if (this.gravityTimer) this.gravityTimer.remove();
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        level: this.level,
        lines: this.lines,
      });
    });
  }
}
