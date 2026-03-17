import { defineConfig } from 'vite';

export default defineConfig({
  base: '/tjs/',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000, // Phaser is ~1.5 MB; suppress false-alarm warning
  },
});
