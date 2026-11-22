import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const entry = (path) => fileURLToPath(new URL(path, import.meta.url))

// Deployed as the GitHub Pages organization site
// (https://orthogonalinteractive.github.io/), so the base path is the root.
export default defineConfig({
  base: '/',
  plugins: [vue()],
  build: {
    rollupOptions: {
      // Further entries so GitHub Pages serves the AR page at /xr/, its
      // visit count at /xr/stats/ and the hand-tracking demo at /handtracking/.
      input: {
        main: entry('index.html'),
        xr: entry('xr/index.html'),
        stats: entry('xr/stats/index.html'),
        handtracking: entry('handtracking/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.js'],
  },
})
