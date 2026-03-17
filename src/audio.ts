const audio = new Audio(import.meta.env.BASE_URL + 'sounds/cave-music.ogg');
audio.loop = true;

export function startMusic(): void {
  if (audio.paused) audio.play();
}
