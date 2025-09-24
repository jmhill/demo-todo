import { defineConfig } from 'vitest/config';

// Acceptance test configuration - Full stack integration tests
// Run with: npm run test:acceptance
export default defineConfig({
  test: {
    // Set up environment variables for acceptance tests
    env: {
      DB_PASSWORD: 'test-db-password',
      TEST_SECRET: 'test-secret',
    },
    // Named 'acceptance' to distinguish in test output when running multiple configs
    name: 'acceptance',

    // Global setup for container management
    globalSetup: './tests/acceptance/helpers/global-setup.ts',

    coverage: {
      // Same reporters as base for consistency across all test runs
      reporter: ['text', 'json', 'html'],

      // Exclude test utilities and non-testable files
      exclude: [
        'tests/acceptance/helpers/**', // Test helper utilities don't need coverage
        'vitest*.config.ts', // Config files are not business logic
        '**/*.d.ts', // Type declarations have no runtime code
        '**/dist/**', // Built output already tested via source
      ],
    },

    // Only include tests in the dedicated tests directory
    // Keeps acceptance tests separate from unit tests for clear boundaries
    include: ['tests/**/*.{test,spec}.{js,ts}'],

    // Reduced timeout since container starts once
    // 10 seconds is sufficient for individual test operations
    testTimeout: 10000,

    // Use forked processes instead of threads for better isolation
    pool: 'forks',

    // Disable file-level parallelism to ensure single container instance
    fileParallelism: false,

    // Run tests sequentially in a single fork to prevent:
    // - Database conflicts when cleaning between tests
    // - Port binding conflicts between parallel tests
    // - Race conditions with shared container
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
