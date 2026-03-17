import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.js'],
    environment: 'node', // fake-indexeddb polyfills IndexedDB for Node
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.d.ts', 'test/**'],
    },
    testTimeout: 5000,
  },
});
