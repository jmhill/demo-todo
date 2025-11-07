import { defineConfig } from 'vitest/config';

/**
 * Root Vitest configuration using Vitest Projects feature.
 * This consolidates test execution across all workspaces while maintaining
 * separate configurations for different test types (unit vs acceptance).
 *
 * Key benefits:
 * - Single source of truth for global settings (coverage)
 * - Unified test execution across monorepo
 * - Ability to filter by project name (e.g., --project '*:unit')
 * - Coordinated output and reporting
 */
export default defineConfig({
  test: {
    /**
     * Reporter configuration for clearer output with multi-project setup.
     * - 'verbose' in local dev: Shows each test immediately with project names
     * - 'default' in CI: More compact output for CI logs
     */
    reporters: process.env.CI ? ['default'] : ['verbose'],

    /**
     * Include file:line:column in test output for easier navigation.
     * Disabled in CI to reduce noise.
     */
    includeTaskLocation: !process.env.CI,

    /**
     * Global coverage configuration applies to all projects.
     * Cannot be overridden at project level per Vitest design.
     */
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
        '**/*.config.{js,ts}', // Configuration files
        '**/node_modules/**', // Dependencies
      ],
    },
  },

  /**
   * Auto-discover Vitest configurations in all workspace packages.
   * Each workspace can define multiple named projects for different test types.
   */
  projects: ['apps/*', 'libs/*'],
});
