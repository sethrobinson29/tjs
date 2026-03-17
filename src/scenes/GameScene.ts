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

type Board = number[][];

interface ActivePiece {
  pieceIndex: number;
  rotation: number;
  x: number;
  y: number;
}

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function getMatrix(p: ActivePiece): number[][] {
  return PIECES[p.pieceIndex].shape[p.rotation];
}

function collides(board: Board, p: ActivePiece, dx = 0, dy = 0, rot?: number): boolean {
  const matrix = rot !== undefined ? PIECES[p.pieceIndex].shape[rot] : getMatrix(p);
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
  private animGfx!: Phaser.GameObjects.Graphics;

  private active!: ActivePiece;
  private nextIndex!: number;
  private holdIndex = -1;
  private holdUsed = false;

  private score = 0;
  private level = 1;
  private lines = 0;

  private gravityTimer!: Phaser.Time.TimerEvent;
  private gravityMs = GRAVITY_BASE;

  private txtScore!: Phaser.GameObjects.Text;
  private txtLevel!: Phaser.GameObjects.Text;
  private txtLines!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;

  private dasLeft = 0;
  private dasRight = 0;
  private dasDown = 0;
  private dasLeftActive = false;
  private dasRightActive = false;

  private gameOver = false;
  private animating = false;
  private paused = false;

  get isPaused(): boolean { return this.paused; }

  private lockFlashing = false;
  private lockFlashCells: Array<{ col: number; row: number }> = [];

  private pauseOverlay!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver = false;
    this.animating = false;
    this.paused = false;
    this.lockFlashing = false;
    this.board = emptyBoard();
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.holdIndex = -1;
    this.holdUsed = false;

    this.glowGfx = this.add.graphics();
    this.gfx = this.add.graphics();
    this.animGfx = this.add.graphics().setDepth(10);

    this.drawBoardOutline();
    this.buildSidebar();
    this.buildPauseOverlay();
    this.drawScanlines();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyZ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyShift = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyP = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.cursors.up.on('down', () => { if (!this.animating && !this.paused) this.tryRotate(); });
    this.keyZ.on('down', () => { if (!this.animating && !this.paused) this.tryRotate(); });
    this.keySpace.on('down', () => { if (!this.animating && !this.paused) this.hardDrop(); });
    this.keyShift.on('down', () => { if (!this.animating && !this.paused) this.tryHold(); });
    this.keyP.on('down', () => { if (!this.animating && !this.gameOver) this.togglePause(); });
    this.input.keyboard!.on('keydown-ESC', () => { if (!this.animating && !this.gameOver) this.togglePause(); });

    this.nextIndex = randomPiece();
    this.spawnPiece();
    this.resetGravity();
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.animating || this.paused) return;
    this.handleDAS(delta);
  }

  // ─── Pause ─────────────────────────────────────────────────────────────────

  private togglePause(): void {
    this.paused = !this.paused;
    this.gravityTimer.paused = this.paused;
    this.pauseOverlay.setVisible(this.paused);
  }

  private buildPauseOverlay(): void {
    const cx = BOARD_X + (COLS * CELL) / 2;
    const cy = BOARD_Y + (ROWS * CELL) / 2;

    const bg = this.add.rectangle(0, 0, COLS * CELL, ROWS * CELL, 0x000000, 0.7);
    const txt = this.add.text(0, -20, 'PAUSED', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '36px',
      color: '#00d4ff',
      stroke: '#00d4ff',
      strokeThickness: 1,
      shadow: { offsetX: 0, offsetY: 0, color: '#00d4ff', blur: 20, fill: true },
    }).setOrigin(0.5);
    const hint = this.add.text(0, 30, 'P  OR  ESC  TO  RESUME', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '13px',
      color: '#445566',
    }).setOrigin(0.5);

    this.pauseOverlay = this.add.container(cx, cy, [bg, txt, hint]);
    this.pauseOverlay.setDepth(50).setVisible(false);
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
    if (this.animating || this.paused) return;
    if (!collides(this.board, this.active, 0, 1)) {
      this.active.y++;
      this.render();
    } else {
      this.lockPiece();
    }
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
      return;
    }
    this.render();
  }

  private lockPiece(): void {
    const matrix = getMatrix(this.active);
    const pieceIdx = this.active.pieceIndex;
    this.lockFlashCells = [];

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const ny = this.active.y + r;
        const nx = this.active.x + c;
        if (ny >= 0) {
          this.board[ny][nx] = pieceIdx + 1;
          this.lockFlashCells.push({ col: nx, row: ny });
        }
      }
    }

    this.lockFlashing = true;
    this.animating = true;
    this.gravityTimer.paused = true;
    this.render();

    this.time.delayedCall(80, () => {
      this.lockFlashing = false;
      this.afterLock();
    });
  }

  private afterLock(): void {
    const fullRows = this.findFullRows();
    if (fullRows.length > 0) {
      this.playLineClearAnim(fullRows, () => {
        this.doLineClear(fullRows);
        this.animating = false;
        this.spawnPiece();
        this.resetGravity();
      });
    } else {
      this.animating = false;
      this.spawnPiece();
      this.resetGravity();
    }
  }

  private tryRotate(): void {
    const nextRot = (this.active.rotation + 1) % 4;
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

  private findFullRows(): number[] {
    const full: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every(cell => cell !== 0)) full.push(r);
    }
    return full;
  }

  private doLineClear(rows: number[]): void {
    // Splice all full rows first (descending keeps indices valid), then add empty rows
    const sorted = [...rows].sort((a, b) => b - a);
    for (const r of sorted) {
      this.board.splice(r, 1);
    }
    for (let i = 0; i < rows.length; i++) {
      this.board.unshift(new Array(COLS).fill(0));
    }
    const cleared = rows.length;
    this.lines += cleared;
    this.score += (SCORE_TABLE[cleared] ?? 800) * this.level;
    const newLevel = Math.floor(this.lines / LINES_PER_LEVEL) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
    }
    this.updateSidebarText();
  }

  // ─── Animations ────────────────────────────────────────────────────────────

  private playLineClearAnim(rows: number[], callback: () => void): void {
    const is4Line = rows.length === 4;
    const duration = is4Line ? 340 : 200;
    const neonPalette = PIECES.map(p => p.color);
    // Pick the dominant row color for single-clear tint
    const rowColor = PIECES[this.board[rows[0]].find(c => c !== 0)! - 1]?.color ?? 0x00d4ff;

    if (is4Line) {
      this.cameras.main.shake(220, 0.005);
      this.cameras.main.flash(180, 100, 0, 200, true); // softer violet flash
      this.showChromaBlast();
    }

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Linear',
      onUpdate: (tween) => {
        const t = tween.getValue() as number;
        this.animGfx.clear();

        rows.forEach((r, rowIdx) => {
          let color: number;
          let alpha: number;

          if (is4Line) {
            // Rapid rainbow cycle through all neon colors, each row offset
            const ci = Math.floor((t * neonPalette.length * 2.5) + rowIdx) % neonPalette.length;
            color = neonPalette[ci];
            // Pulse brightness and fade out toward end
            alpha = (0.65 + 0.25 * Math.sin(t * Math.PI * 5)) * (1 - t * 0.6);
          } else {
            // Sine flash tinted toward the row's piece color
            const sinA = Math.sin(t * Math.PI);
            color = rowColor;
            alpha = sinA * 0.6;
          }

          this.animGfx.fillStyle(color, alpha);
          this.animGfx.fillRect(BOARD_X, BOARD_Y + r * CELL, COLS * CELL, CELL);

          // Thin bright center stripe
          this.animGfx.fillStyle(0xffffff, alpha * 0.5);
          this.animGfx.fillRect(BOARD_X, BOARD_Y + r * CELL + Math.floor(CELL / 2) - 1, COLS * CELL, 2);
        });
      },
      onComplete: () => {
        this.animGfx.clear();
        callback();
      },
    });
  }

  private showChromaBlast(): void {
    const cx = BOARD_X + (COLS * CELL) / 2;
    const cy = BOARD_Y + (ROWS * CELL) / 2;
    const baseStyle = {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '26px',
      strokeThickness: 2,
    };

    // Three layers: offset chromatic aberration — pink behind-left, cyan behind-right, yellow center
    const layers = [
      { dx: -3, dy:  1, color: '#ff2d78', stroke: '#ff2d78', alpha: 0.7 },
      { dx:  3, dy: -1, color: '#00d4ff', stroke: '#00d4ff', alpha: 0.7 },
      { dx:  0, dy:  0, color: '#d4ff00', stroke: '#bf00ff', alpha: 1.0 },
    ];

    const texts = layers.map(({ dx, dy, color, stroke, alpha }) =>
      this.add.text(cx + dx, cy + dy, 'CHROMABLAST!', {
        ...baseStyle,
        color,
        stroke,
        shadow: { offsetX: 0, offsetY: 0, color: stroke, blur: 22, fill: true },
      }).setOrigin(0.5).setDepth(20).setAlpha(alpha),
    );

    this.tweens.add({
      targets: texts,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 520,
      ease: 'Power2.Out',
      onComplete: () => texts.forEach(t => t.destroy()),
    });
  }

  // ─── DAS input ────────────────────────────────────────────────────────────

  private handleDAS(delta: number): void {
    const left = this.cursors.left.isDown;
    const right = this.cursors.right.isDown;
    const down = this.cursors.down.isDown;

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
    if (!this.lockFlashing) {
      this.drawGhostPiece();
      this.drawActivePiece();
    }
    this.drawNextPiece();
    this.drawHoldPiece();
  }

  private drawBoardOutline(): void {
    this.gfx.lineStyle(1, 0x222244, 1);
    this.gfx.strokeRect(BOARD_X - 1, BOARD_Y - 1, COLS * CELL + 2, ROWS * CELL + 2);
  }

  private drawGrid(): void {
    this.gfx.lineStyle(1, 0x111122, 0.4);
    for (let c = 1; c < COLS; c++) {
      this.gfx.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + ROWS * CELL);
    }
    for (let r = 1; r < ROWS; r++) {
      this.gfx.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
    }
  }

  private drawLockedCells(): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = this.board[r][c];
        if (!idx) continue;
        const piece = PIECES[idx - 1];
        const flashing = this.lockFlashing && this.lockFlashCells.some(fc => fc.col === c && fc.row === r);
        this.drawCell(c, r, piece.color, flashing);
      }
    }
  }

  private drawActivePiece(): void {
    const matrix = getMatrix(this.active);
    const piece = PIECES[this.active.pieceIndex];
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        this.drawCell(this.active.x + c, this.active.y + r, piece.color, false);
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

  private drawCell(col: number, row: number, color: number, flash: boolean): void {
    const px = BOARD_X + col * CELL;
    const py = BOARD_Y + row * CELL;
    const inset = 2;

    if (flash) {
      // Soft neon bloom in piece color — no harsh white
      this.glowGfx.lineStyle(10, color, 0.3);
      this.glowGfx.strokeRect(px + inset - 5, py + inset - 5, CELL - inset * 2 + 10, CELL - inset * 2 + 10);
      this.glowGfx.lineStyle(5, color, 0.5);
      this.glowGfx.strokeRect(px + inset - 2, py + inset - 2, CELL - inset * 2 + 4, CELL - inset * 2 + 4);

      // Tinted fill in piece color + small white inner highlight for depth
      this.gfx.fillStyle(color, 0.32);
      this.gfx.fillRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);
      this.gfx.fillStyle(0xffffff, 0.12);
      this.gfx.fillRect(px + inset + 3, py + inset + 3, CELL - inset * 2 - 6, Math.floor((CELL - inset * 2) * 0.45));
      this.gfx.lineStyle(2, color, 1);
      this.gfx.strokeRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);
    } else {
      // Normal neon hollow block
      this.glowGfx.lineStyle(4, color, 0.15);
      this.glowGfx.strokeRect(px + inset - 2, py + inset - 2, CELL - inset * 2 + 4, CELL - inset * 2 + 4);
      this.glowGfx.lineStyle(2, color, 0.3);
      this.glowGfx.strokeRect(px + inset - 1, py + inset - 1, CELL - inset * 2 + 2, CELL - inset * 2 + 2);

      this.gfx.fillStyle(color, 0.08);
      this.gfx.fillRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);
      this.gfx.lineStyle(1.5, color, 1);
      this.gfx.strokeRect(px + inset, py + inset, CELL - inset * 2, CELL - inset * 2);

      const cs = 4;
      this.gfx.lineStyle(1.5, color, 1);
      this.gfx.lineBetween(px + inset,        py + inset,        px + inset + cs,      py + inset);
      this.gfx.lineBetween(px + inset,        py + inset,        px + inset,           py + inset + cs);
      this.gfx.lineBetween(px + CELL - inset, py + inset,        px + CELL - inset - cs, py + inset);
      this.gfx.lineBetween(px + CELL - inset, py + inset,        px + CELL - inset,    py + inset + cs);
      this.gfx.lineBetween(px + inset,        py + CELL - inset, px + inset + cs,      py + CELL - inset);
      this.gfx.lineBetween(px + inset,        py + CELL - inset, px + inset,           py + CELL - inset - cs);
      this.gfx.lineBetween(px + CELL - inset, py + CELL - inset, px + CELL - inset - cs, py + CELL - inset);
      this.gfx.lineBetween(px + CELL - inset, py + CELL - inset, px + CELL - inset,    py + CELL - inset - cs);
    }
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
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
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

    this.add.text(sx, 14,  'SCORE', labelStyle);
    this.txtScore = this.add.text(sx, 30,  '0', valueStyle);
    this.add.text(sx, 90,  'LEVEL', labelStyle);
    this.txtLevel = this.add.text(sx, 106, '1', valueStyle);
    this.add.text(sx, 160, 'LINES', labelStyle);
    this.txtLines = this.add.text(sx, 176, '0', valueStyle);
    this.add.text(sx, 240, 'NEXT',  labelStyle);
    this.add.text(sx, 360, 'HOLD',  labelStyle);
    this.add.text(sx, CANVAS_HEIGHT - 30, '[ P ] PAUSE', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '11px',
      color: '#333355',
    });
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
