import express, { type Express } from 'express';
import { healthCheckHandler } from './healthcheck.js';
import { configureSecureHeaders } from './security/secure-headers.js';
import { configureCors } from './security/cors.js';
import { configureRateLimiting } from './security/rate-limiting.js';
import { configureRequestLimits } from './security/request-limits.js';
import type { AppConfig } from './config/schema.js';

export const createApp = (config: AppConfig): Express => {
  const app = express();

  // Configure services
  // TODO: Add service configuration based on config

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

  // Configure default error handlers
  // TODO: Add error handlers

  return app;
};
