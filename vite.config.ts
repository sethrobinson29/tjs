import { defineConfig } from 'vite';

export default defineConfig({
  // Set base to './' for GitHub Pages (relative paths work from any sub-path)
  base: './',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000, // Phaser is ~1.5 MB; suppress false-alarm warning
  },
  optimizeDeps: {
    exclude: ['phaser'],
  },
});
