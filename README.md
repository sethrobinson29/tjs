# CHROMABLOCKS

A falling-block puzzle game built with Phaser 3 + TypeScript.

**[Play it →](https://sethrobinson29.github.io/tjs/)**

## Controls

| Key | Action |
|-----|--------|
| ← → | Move |
| ↑ / Z | Rotate |
| ↓ | Soft drop |
| Space | Hard drop |
| Shift | Hold piece |
| P / Esc | Pause |
| S | Settings |

## Settings

Accessible via the gear icon (⚙) or pressing **S** while paused. Preferences are saved as cookies (30-day expiry):

| Setting | Cookie |
|---------|--------|
| Music volume | `chromablocks_vol` |
| SFX volume | `chromablocks_sfx_vol` |
| Mute | `chromablocks_mute` |
| Colorblind mode | `chromablocks_cb` |

Colorblind mode swaps piece colors to the [Wong colorblind-safe palette](https://www.nature.com/articles/nmeth.1618), distinguishable across deuteranopia, protanopia, and tritanopia.

## Stack

- [Phaser 3](https://phaser.io/) — 2D game framework
- TypeScript
- Vite

## Development

```bash
npm install
npm run dev      # localhost with HMR
npm run build    # production build → dist/
npm run deploy   # build + push to GitHub Pages
```
