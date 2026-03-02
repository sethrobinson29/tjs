import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BG_COLOR } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: BG_COLOR,
  parent: 'game',
  scene: [MenuScene, GameScene, GameOverScene],
  render: {
    antialias: false,
    pixelArt: false,
  },
};

new Phaser.Game(config);
