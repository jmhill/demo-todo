import express from 'express';
import { healthCheckHandler } from './healthcheck.js';
import { configureSecureHeaders } from './security/secure-headers.js';
import { configureCors } from './security/cors.js';
import { configureRateLimiting } from './security/rate-limiting.js';
import { configureRequestLimits } from './security/request-limits.js';

// Express initialization
export const app = express();
const port = 3000;

// Configure services
// TODO

// Configure global middleware
configureSecureHeaders(app);
configureCors(app);
configureRateLimiting(app);
configureRequestLimits(app);

// Configure route handlers
app.get('/health', healthCheckHandler);
app.post('/health', healthCheckHandler);

// Configure default error handlers

// Start server only if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
  });
}
