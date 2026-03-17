const VOLUME_COOKIE = 'chromablocks_vol';

function loadVolumeCookie(): number | null {
  const match = document.cookie.match(/(?:^|; )chromablocks_vol=([^;]*)/);
  return match ? parseFloat(match[1]) : null;
}

function saveVolumeCookie(v: number): void {
  document.cookie = `${VOLUME_COOKIE}=${v}; max-age=31536000; path=/`;
}

const audio = new Audio(import.meta.env.BASE_URL + 'sounds/cave-music.ogg');
audio.loop = true;

const savedVol = loadVolumeCookie();
if (savedVol !== null) audio.volume = savedVol;

export function startMusic(): void {
  if (audio.paused) audio.play();
}

export function setVolume(v: number): void {
  audio.volume = Math.max(0, Math.min(1, v));
  saveVolumeCookie(audio.volume);
}
export function setMuted(m: boolean): void { audio.muted = m; }
export function getVolume(): number { return audio.volume; }
export function getMuted(): boolean { return audio.muted; }
