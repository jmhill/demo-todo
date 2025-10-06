import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server for Node.js test environment
 * Intercepts HTTP requests and returns mocked responses
 */
export const server = setupServer(...handlers);
