import { defineConfig } from 'vitest/config';

// Unit test configuration - Fast, isolated tests co-located with source code
// Run with: npm run test:unit
export default defineConfig({
  test: {
    // Named 'unit' to distinguish in test output when running multiple configs
    name: 'unit',

    // Global setup for MySQL testcontainer (shared with acceptance tests)
    globalSetup: './tests/acceptance/helpers/global-setup.ts',

    // Coverage settings specific to unit tests
    coverage: {
      // Same reporters as base for consistency across all test runs
      reporter: ['text', 'json', 'html'],

      // Unit tests should not include acceptance test coverage
      exclude: [
        'tests/**', // Acceptance tests are measured separately
        'vitest*.config.ts', // Config files are not business logic
        '**/*.d.ts', // Type declarations have no runtime code
        '**/dist/**', // Built output already tested via source
      ],
    },

    // Only include tests co-located with source code
    // This ensures unit tests stay close to the code they test
    include: ['src/**/*.{test,spec}.{js,ts}'],

    // Unit tests should be fast - 5 second timeout enforces this
    // If a unit test takes longer, it's likely testing too much
    testTimeout: 5000,

    // Use forked processes instead of threads for better database isolation
    pool: 'forks',

    // Disable file-level parallelism to prevent database conflicts
    // when multiple test files try to clean/write to the shared container
    fileParallelism: false,
  },
});
