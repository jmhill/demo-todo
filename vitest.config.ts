import { defineConfig } from 'vitest/config';

// Base configuration used when running 'npm test' without specific config
// Runs all tests across the entire codebase
export default defineConfig({
  test: {
    // Coverage configuration shared across all test runs
    coverage: {
      // Multiple reporters for different consumption needs:
      // - 'text': Quick terminal output during development
      // - 'json': Machine-readable for CI/CD pipelines
      // - 'html': Interactive browser view for detailed analysis
      reporter: ['text', 'json', 'html'],

      // Exclude non-testable files from coverage metrics
      exclude: [
        'tests/acceptance/helpers/**', // Test utilities shouldn't count toward coverage
        'vitest*.config.ts', // Config files are not business logic
        '**/*.d.ts', // Type declaration files have no runtime code
        '**/dist/**', // Built output is already tested via source
      ],
    },

    // Include both unit tests (co-located with source) and acceptance tests
    // This pattern runs when using 'npm test' for a complete test suite
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
  },
});
