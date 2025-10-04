import '@testing-library/jest-dom/vitest';

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
