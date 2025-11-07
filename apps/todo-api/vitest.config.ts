import { defineConfig } from 'vitest/config';

/**
 * Todo API test configuration using Vitest Projects.
 * Consolidates unit and acceptance test configurations into named projects.
 *
 * Projects:
 * - todo-api:unit - Fast, isolated unit tests co-located with source
 * - todo-api:acceptance - Full stack integration tests with testcontainers
 */
export default defineConfig({
  test: {
    // Define multiple test projects for different test types
    projects: [
      // Unit Tests - Fast, focused tests co-located with source code
      {
        test: {
          name: 'todo-api:unit',

          // Global setup for MySQL testcontainer
          globalSetup: './tests/acceptance/helpers/global-setup.ts',

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

          // Automatically restore environment variables after each test
          unstubEnvs: true,
        },
      },

      // Acceptance Tests - Full stack integration tests
      {
        test: {
          name: 'todo-api:acceptance',

          // Global setup for MySQL testcontainer
          globalSetup: './tests/acceptance/helpers/global-setup.ts',

          // Set up environment variables for acceptance tests
          env: {
            DB_PASSWORD: 'test-db-password',
          },

          // Only include tests in the dedicated tests directory
          // Keeps acceptance tests separate from unit tests for clear boundaries
          include: ['tests/**/*.{test,spec}.{js,ts}'],

          // 10 seconds is sufficient for individual test operations
          testTimeout: 10000,

          // Use forked processes instead of threads for better database isolation
          pool: 'forks',

          // Disable file-level parallelism to prevent database conflicts
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

          // Automatically restore environment variables after each test
          unstubEnvs: true,
        },
      },
    ],
  },
});
