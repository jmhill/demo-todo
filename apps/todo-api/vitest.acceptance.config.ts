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

    // Acceptance tests may take longer - 30 seconds allows for:
    // - Server startup/shutdown
    // - Database operations
    // - External API calls
    // - Full user workflows
    testTimeout: 30000,

    // Use forked processes instead of threads for better isolation
    // Critical for acceptance tests that may:
    // - Bind to specific ports
    // - Modify global state
    // - Use resources that don't work well with threading
    pool: 'forks',

    // Run tests sequentially in a single fork to prevent:
    // - Port binding conflicts between parallel tests
    // - Database transaction conflicts
    // - Rate limiting issues with external services
    // - Resource contention in CI/CD environments
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
