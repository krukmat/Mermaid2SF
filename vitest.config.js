import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['web/frontend/__tests__/setup.js'],
    include: ['web/frontend/__tests__/**/*.test.mjs'],
  },
});
