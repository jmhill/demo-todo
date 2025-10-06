import '@testing-library/jest-dom/vitest';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';
import { resetMockState } from './mocks/handlers';

// Suppress jsdom CSS parsing errors for modern CSS features
// (Chakra UI and other CSS-in-JS libraries use features jsdom can't parse)
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = String(args[0]);
  if (
    message.includes('Could not parse CSS stylesheet') ||
    message.includes('Error: Could not parse CSS stylesheet')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    // Fail tests if there's an unhandled request
    onUnhandledRequest: 'error',
  });
});

// Reset handlers and clear state after each test
afterEach(() => {
  server.resetHandlers();
  resetMockState();
  localStorage.clear();
});

// Clean up and close server after all tests
afterAll(() => {
  server.close();
});
