import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface GameOverData {
  score: number;
  level: number;
  lines: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const cx = CANVAS_WIDTH / 2;

    // Dim overlay
    this.add.rectangle(cx, CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.7);

    this.add.text(cx, 140, 'GAME OVER', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '42px',
      color: '#ff2d78',
      stroke: '#ff2d78',
      strokeThickness: 1,
      shadow: { offsetX: 0, offsetY: 0, color: '#ff2d78', blur: 24, fill: true },
    }).setOrigin(0.5);

    const stats = [
      { label: 'SCORE', value: data.score },
      { label: 'LEVEL', value: data.level },
      { label: 'LINES', value: data.lines },
    ];

    const best = parseInt(localStorage.getItem('chromablocks_best') ?? '0', 10);
    if (data.score > best) {
      localStorage.setItem('chromablocks_best', String(data.score));
      this.add.text(cx, 215, 'NEW BEST!', {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '20px',
        color: '#d4ff00',
        shadow: { offsetX: 0, offsetY: 0, color: '#d4ff00', blur: 12, fill: true },
      }).setOrigin(0.5);
    }

    stats.forEach(({ label, value }, i) => {
      this.add.text(cx, 270 + i * 40, `${label}  ${value}`, {
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '22px',
        color: '#00ffcc',
      }).setOrigin(0.5);
    });

    const prompt = this.add.text(cx, 420, 'R — RESTART    M — MENU', {
      fontFamily: '"Share Tech Mono", monospace',
      fontSize: '16px',
      color: '#00d4ff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const kb = this.input.keyboard!;
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.R).once('down', () => {
      this.scene.start('GameScene');
    });
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.M).once('down', () => {
      this.scene.start('MenuScene');
    });
  }
}
