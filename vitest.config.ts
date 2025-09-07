import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/acceptance/helpers/**',
        'vitest.config.ts',
        '**/*.d.ts',
        '**/dist/**',
      ],
    },
    // No globals - explicit imports required for clarity
    globals: false,
    // Different test configurations can be specified via environment variables
    // or by using different config files (vitest.unit.config.ts, vitest.acceptance.config.ts)
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
    // Optionally separate unit and acceptance test configurations
    // Unit tests: fast, isolated, co-located with source
    // Acceptance tests: slower, full application stack, in tests/ directory
  },
});
