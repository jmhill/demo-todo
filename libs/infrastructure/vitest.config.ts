import { defineProject } from 'vitest/config';

/**
 * Infrastructure library test configuration.
 * Simple unit tests for shared utilities (clock, ID generator, etc.)
 */
export default defineProject({
  test: {
    name: 'infrastructure:unit',
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});
