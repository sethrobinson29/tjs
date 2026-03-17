import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { SettingsScene } from './scenes/SettingsScene';
import { CANVAS_WIDTH, CANVAS_HEIGHT, BG_COLOR } from './constants';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: BG_COLOR,
  parent: 'game',
  dom: { createContainer: true },
  scene: [MenuScene, GameScene, GameOverScene, SettingsScene],
  render: {
    antialias: false,
    pixelArt: false,
  },
});

// Launch the settings overlay alongside other scenes so the gear is always visible
game.events.once('ready', () => {
  game.scene.run('SettingsScene');
});
