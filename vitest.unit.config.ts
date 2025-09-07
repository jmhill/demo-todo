import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['tests/**', 'vitest.*.config.ts', '**/*.d.ts', '**/dist/**'],
    },
    // No globals - explicit imports for clarity
    globals: false,
    // Only include unit tests co-located with source
    include: ['src/**/*.{test,spec}.{js,ts}'],
    // Unit tests should be fast
    testTimeout: 5000,
  },
});
