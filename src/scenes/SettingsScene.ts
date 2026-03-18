import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { setVolume, setMuted, getVolume, getMuted, setSfxVolume, getSfxVolume, sfxSettings, getColorblind, setColorblind } from '../audio';

const GEAR_COLOR = '#ff9500';

const PANEL_HTML = `
<style>
  #sp-wrap {
    width: 280px;
    background: rgba(10,10,15,0.96);
    border: 1px solid #ff9500;
    box-shadow: 0 0 24px rgba(255,149,0,0.25), 0 0 2px rgba(255,149,0,0.6) inset;
    padding: 28px 24px 20px;
    font-family: 'Share Tech Mono', monospace;
    box-sizing: border-box;
  }
  #sp-title {
    font-size: 16px;
    letter-spacing: 4px;
    color: #ff9500;
    text-shadow: 0 0 10px #ff9500;
    text-align: center;
    margin-bottom: 28px;
  }
  .sp-label {
    font-size: 11px;
    letter-spacing: 2px;
    color: #555577;
    margin-bottom: 10px;
  }
  .sp-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 3px;
    background: #222244;
    outline: none;
    border: none;
    cursor: pointer;
    margin-bottom: 24px;
    display: block;
  }
  .sp-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #ff9500;
    box-shadow: 0 0 6px #ff9500;
    cursor: pointer;
    border: none;
  }
  .sp-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #ff9500;
    box-shadow: 0 0 6px #ff9500;
    cursor: pointer;
    border: none;
  }
  .sp-mute-row {
    display: flex;
    align-items: center;
    margin-bottom: 28px;
  }
  .sp-mute-label {
    font-size: 11px;
    letter-spacing: 2px;
    color: #555577;
    flex: 1;
  }
  #sp-mute-box, #sp-cb-box {
    width: 18px;
    height: 18px;
    border: 1px solid #ff9500;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #ff9500;
    text-shadow: 0 0 6px #ff9500;
    user-select: none;
  }
  .sp-btn {
    width: 100%;
    padding: 8px 0;
    margin-bottom: 8px;
    background: transparent;
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    letter-spacing: 3px;
    cursor: pointer;
    display: block;
    text-align: center;
  }
  #sp-close-btn {
    border: 1px solid #ff9500;
    color: #ff9500;
    text-shadow: 0 0 8px #ff9500;
    box-shadow: 0 0 8px rgba(255,149,0,0.15) inset;
  }
  #sp-close-btn:hover { box-shadow: 0 0 14px rgba(255,149,0,0.3) inset; }
  #sp-menu-btn {
    border: 1px solid #333355;
    color: #555577;
    margin-bottom: 0;
  }
  #sp-menu-btn:hover { border-color: #555577; color: #888899; }
</style>
<div id="sp-wrap">
  <div id="sp-title">SETTINGS</div>
  <div class="sp-label">MUSIC VOLUME</div>
  <input id="sp-vol-slider" class="sp-slider" type="range" min="0" max="1" step="0.01">
  <div class="sp-label">SFX VOLUME</div>
  <input id="sp-sfx-slider" class="sp-slider" type="range" min="0" max="1" step="0.01">
  <div class="sp-mute-row">
    <div class="sp-mute-label">MUTE</div>
    <div id="sp-mute-box"></div>
  </div>
  <div class="sp-mute-row">
    <div class="sp-mute-label">COLORBLIND  MODE</div>
    <div id="sp-cb-box"></div>
  </div>
  <button id="sp-close-btn" class="sp-btn">CLOSE</button>
  <button id="sp-menu-btn" class="sp-btn">MAIN  MENU</button>
</div>
`;

export class SettingsScene extends Phaser.Scene {
  private gearText!: Phaser.GameObjects.Text;
  private panelDom!: Phaser.GameObjects.DOMElement;
  private panelVisible = false;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.gearText = this.add.text(CANVAS_WIDTH - 24, 20, '⚙', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: GEAR_COLOR,
    }).setOrigin(0.5).setDepth(150).setAlpha(0.5).setInteractive({ useHandCursor: true });

    this.gearText.on('pointerover', () => this.gearText.setAlpha(1));
    this.gearText.on('pointerout', () => { if (!this.panelVisible) this.gearText.setAlpha(0.5); });
    this.gearText.on('pointerdown', () => this.togglePanel());

    this.panelDom = this.add.dom(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2).createFromHTML(PANEL_HTML);
    this.panelDom.setDepth(200).setVisible(false);
    this.wirePanel();

    this.input.keyboard!.on('keydown-S', () => {
      if (this.canToggleWithKey()) this.togglePanel();
    });
  }

  private canToggleWithKey(): boolean {
    if (this.panelVisible) return true;
    if (this.scene.isActive('MenuScene')) return true;
    const gs = this.scene.get('GameScene') as any;
    return gs?.isPaused === true;
  }

  private wirePanel(): void {
    const el = this.panelDom.node as HTMLElement;
    const volSlider = el.querySelector('#sp-vol-slider') as HTMLInputElement;
    const sfxSlider = el.querySelector('#sp-sfx-slider') as HTMLInputElement;
    const muteBox   = el.querySelector('#sp-mute-box')   as HTMLDivElement;
    const cbBox     = el.querySelector('#sp-cb-box')     as HTMLDivElement;
    const closeBtn  = el.querySelector('#sp-close-btn')  as HTMLButtonElement;
    const menuBtn   = el.querySelector('#sp-menu-btn')   as HTMLButtonElement;

    volSlider.value = String(getVolume());
    sfxSlider.value = String(getSfxVolume());
    muteBox.textContent = getMuted() ? '✕' : '';
    cbBox.textContent = getColorblind() ? '✕' : '';

    volSlider.addEventListener('input', () => setVolume(parseFloat(volSlider.value)));
    sfxSlider.addEventListener('input', () => setSfxVolume(parseFloat(sfxSlider.value)));

    muteBox.addEventListener('click', () => {
      setMuted(!getMuted());
      muteBox.textContent = getMuted() ? '✕' : '';
    });

    cbBox.addEventListener('click', () => {
      setColorblind(!getColorblind());
      cbBox.textContent = getColorblind() ? '✕' : '';
    });

    closeBtn.addEventListener('click', () => this.togglePanel());

    menuBtn.addEventListener('click', () => {
      this.togglePanel();
      (['GameScene', 'GameOverScene'] as const).forEach(key => {
        if (this.scene.isActive(key)) this.scene.stop(key);
      });
      if (!this.scene.isActive('MenuScene')) this.scene.launch('MenuScene');
    });
  }

  private togglePanel(): void {
    this.panelVisible = !this.panelVisible;
    this.panelDom.setVisible(this.panelVisible);
    this.gearText.setAlpha(this.panelVisible ? 1 : 0.5);
    const gs = this.scene.get('GameScene') as any;
    if (this.panelVisible) {
      sfxSettings();
      gs?.suspendForSettings?.();
    } else {
      gs?.resumeFromSettings?.();
    }
  }
}
