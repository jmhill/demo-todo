import express, { type Express } from 'express';
import { healthCheckHandler } from './healthcheck.js';
import { configureSecureHeaders } from './security/secure-headers.js';
import { configureCors } from './security/cors.js';
import { configureRateLimiting } from './security/rate-limiting.js';
import { configureRequestLimits } from './security/request-limits.js';
import type { AppConfig } from './config/schema.js';
import { createUserRouter } from './users/user-router.js';
import { createMySQLUserStore } from './users/user-store-mysql.js';
import { createUserService } from './users/user-service.js';

export async function createApp(config: AppConfig): Promise<Express> {
  // Wire all dependencies based on config
  const userStore = await createMySQLUserStore(config.database);
  const userService = createUserService(userStore);

  // Future dependencies will be added here:
  // const orderStore = await createMySQLOrderStore(config.database);
  // const orderService = createOrderService(orderStore);

  const app = express();

  // Trust proxy configuration for deployments behind load balancers/proxies
  // In production, this should match your actual proxy setup (e.g., number of hops)
  // Using 1 hop as a reasonable default for single proxy/load balancer
  // This allows Express to correctly handle X-Forwarded-* headers without being overly permissive
  app.set('trust proxy', 1);

  // Configure global middleware based on config
  if (config.security.secureHeaders.enabled) {
    configureSecureHeaders(app, config.security.secureHeaders);
  }

  if (config.security.cors.enabled) {
    configureCors(app, config.security.cors);
  }

  if (config.security.rateLimiting.enabled) {
    configureRateLimiting(app, config.security.rateLimiting);
  }

  if (config.security.requestLimits.enabled) {
    configureRequestLimits(app, config.security.requestLimits);
  }

  // Configure route handlers
  app.get('/health', healthCheckHandler);
  app.post('/health', healthCheckHandler);

  // Wire up user routes
  app.use('/users', createUserRouter(userService));

  // Configure default error handlers
  // TODO: Add error handlers

  return app;
}
