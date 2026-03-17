// ─── Cookies ──────────────────────────────────────────────────────────────────

function loadCookie(key: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function saveCookie(key: string, value: string): void {
  document.cookie = `${key}=${value}; max-age=31536000; path=/`;
}

// ─── Music ────────────────────────────────────────────────────────────────────

const audio = new Audio(import.meta.env.BASE_URL + 'sounds/cave-music.ogg');
audio.loop = true;

const savedVol = loadCookie('chromablocks_vol');
if (savedVol !== null) audio.volume = parseFloat(savedVol);

const savedMute = loadCookie('chromablocks_mute');
if (savedMute !== null) audio.muted = savedMute === '1';

export function startMusic(): void {
  if (audio.paused) audio.play();
}

export function setVolume(v: number): void {
  audio.volume = Math.max(0, Math.min(1, v));
  saveCookie('chromablocks_vol', String(audio.volume));
}
export function setMuted(m: boolean): void {
  audio.muted = m;
  saveCookie('chromablocks_mute', m ? '1' : '0');
}
export function getVolume(): number { return audio.volume; }
export function getMuted(): boolean { return audio.muted; }

// ─── SFX ──────────────────────────────────────────────────────────────────────

let sfxVol = 1;
const savedSfxVol = loadCookie('chromablocks_sfx_vol');
if (savedSfxVol !== null) sfxVol = parseFloat(savedSfxVol);

export function setSfxVolume(v: number): void {
  sfxVol = Math.max(0, Math.min(1, v));
  saveCookie('chromablocks_sfx_vol', String(sfxVol));
}
export function getSfxVolume(): number { return sfxVol; }

let sfxCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!sfxCtx || sfxCtx.state === 'closed') sfxCtx = new AudioContext();
  if (sfxCtx.state === 'suspended') sfxCtx.resume();
  return sfxCtx;
}

function note(
  freq: number, endFreq: number,
  vol: number, attack: number, hold: number, decay: number,
  shape: OscillatorType = 'sine',
  offset = 0,
): void {
  if (audio.muted) return;
  const c = ctx();
  const t = c.currentTime + offset;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = shape;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.linearRampToValueAtTime(endFreq, t + attack + hold + decay);
  const v = vol * sfxVol;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(v, t + attack);
  gain.gain.setValueAtTime(v, t + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
  osc.start(t);
  osc.stop(t + attack + hold + decay + 0.05);
}

export function sfxRotateCW():    void { note(360, 560, .5,  .005, 0,   .07); }
export function sfxLock():        void {
  note(180, 60,  .55, .002, 0, .08, 'sawtooth');
  note(220, 90,  .4,  .002, 0, .05, 'square');
}
export function sfxLineClear():   void {
  note(400,  900,  .22, .01, .04, .18);
  note(600,  1100, .14, .01, .04, .18, 'sine', .04);
}
export function sfxChromaBlast(): void {
  note(180,  80,   .5,  .005, .05, .35, 'sawtooth');
  note(440,  880,  .4,  .01,  .08, .3,  'sine',     .02);
  note(880,  1760, .3,  .02,  .06, .25, 'sine',     .06);
  note(220,  440,  .35, .01,  .1,  .4,  'triangle', .04);
}
export function sfxPause():       void { note(520, 520, .2,  .005, .02, .1); }
export function sfxSettings():    void { note(700, 420, .18, .002, 0,   .05, 'square'); }
