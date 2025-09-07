import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'acceptance',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/acceptance/helpers/**',
        'vitest.*.config.ts',
        '**/*.d.ts',
        '**/dist/**',
      ],
    },
    // No globals - explicit imports for clarity
    globals: false,
    // Only include acceptance tests in tests directory
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    // Acceptance tests may take longer
    testTimeout: 30000,
    // Run acceptance tests sequentially to avoid port conflicts and rate limiting issues
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
