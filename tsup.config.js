import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],
  dts: false, // Phase 5 will add TypeScript
  clean: true,
  sourcemap: true,
});
