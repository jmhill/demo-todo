import type { Express } from 'express';
import rateLimit from 'express-rate-limit';
import type { RateLimitingConfig } from '../config/schema.js';

export const configureRateLimiting = (
  app: Express,
  config: RateLimitingConfig,
): void => {
  const limiter = rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: true, // Enable the `X-RateLimit-*` headers
  });

  app.use(limiter);
};
