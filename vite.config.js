import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Deployed as the GitHub Pages organization site
// (https://orthogonalinteractive.github.io/), so the base path is the root.
export default defineConfig({
  base: '/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.js'],
  },
})
