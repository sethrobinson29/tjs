import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const cx = CANVAS_WIDTH / 2;

    // Background scanline overlay
    this.drawScanlines();

    // Title
    this.add.text(cx, 120, 'CHROMA', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '52px',
      color: '#00d4ff',
      stroke: '#00d4ff',
      strokeThickness: 1,
      shadow: { offsetX: 0, offsetY: 0, color: '#00d4ff', blur: 20, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 178, 'BLOCKS', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '52px',
      color: '#ff2d78',
      stroke: '#ff2d78',
      strokeThickness: 1,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff2d78', blur: 20, fill: true },
    }).setOrigin(0.5);

    // Best score
    const best = localStorage.getItem('chromablocks_best') ?? '0';
    this.add.text(cx, 270, `BEST: ${best}`, {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5);

    // Blink prompt
    const prompt = this.add.text(cx, 340, 'PRESS ENTER TO PLAY', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '20px',
      color: '#d4ff00',
      shadow: { offsetX: 0, offsetY: 0, color: '#d4ff00', blur: 12, fill: true },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Controls hint
    const controls = [
      '← →   move',
      '↑ / Z   rotate',
      '↓   soft drop',
      'SPC   hard drop',
      'SHIFT   hold',
    ];
    controls.forEach((line, i) => {
      this.add.text(cx, 430 + i * 24, line, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '14px',
        color: '#555577',
      }).setOrigin(0.5);
    });

    // Start on Enter
    const enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enter.once('down', () => {
      this.scene.start('GameScene');
    });
  }

  private drawScanlines(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x000000, 0.04);
    for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
      gfx.fillRect(0, y, CANVAS_WIDTH, 1);
    }
  }
}
