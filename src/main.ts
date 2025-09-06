import express from 'express';
import { healthCheckHandler } from './healthcheck.js';

// Express initialization
export const app = express();
const port = 3000;

// Configure services
// TODO

// Configure global middleware
// -- none yet --

// Configure route handlers
app.get('/health', healthCheckHandler);

// Configure default error handlers

// Start server only if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
  });
}
