import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/acceptance/setup.ts',
    include: ['tests/acceptance/**/*.test.{ts,tsx}'],
    testTimeout: 10000, // Longer timeout for workflow tests
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000'),
  },
});
