import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Todo UI test configuration using Vitest Projects.
 * Consolidates unit and acceptance test configurations into named projects.
 *
 * Projects:
 * - todo-ui:unit - Component unit tests with React Testing Library
 * - todo-ui:acceptance - Full workflow acceptance tests with MSW
 */
export default defineConfig({
  test: {
    // Define multiple test projects for different test types
    projects: [
      // Unit Tests - Component tests with React Testing Library
      {
        plugins: [react()],
        test: {
          name: 'todo-ui:unit',

          globals: true,
          environment: 'jsdom',

          // Setup file for React Testing Library configuration
          setupFiles: './vitest.setup.ts',

          // Include all test files except acceptance tests
          // Default include pattern covers src/**/*.test.{ts,tsx}
          exclude: ['**/node_modules/**', '**/tests/acceptance/**'],
        },
      },

      // Acceptance Tests - Full user workflow tests
      {
        plugins: [react()],
        test: {
          name: 'todo-ui:acceptance',

          globals: true,
          environment: 'jsdom',

          // Setup file includes MSW handlers for API mocking
          setupFiles: './tests/acceptance/setup.ts',

          // Only include tests in the dedicated acceptance directory
          include: ['tests/acceptance/**/*.test.{ts,tsx}'],

          // Longer timeout for workflow tests that simulate user interactions
          testTimeout: 10000,

          // Ensure MSW (Mock Service Worker) is handled correctly
          server: {
            deps: {
              inline: ['msw'],
            },
          },
        },
        // Define API URL for acceptance tests
        define: {
          'import.meta.env.VITE_API_URL': JSON.stringify(
            'http://localhost:3000',
          ),
        },
      },
    ],
  },
});
