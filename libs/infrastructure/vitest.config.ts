import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'infrastructure',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['vitest*.config.ts', '**/*.d.ts', '**/dist/**'],
    },
  },
});
