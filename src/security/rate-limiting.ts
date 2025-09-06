import type { Express } from 'express';
import rateLimit from 'express-rate-limit';

export const configureRateLimiting = (app: Express): void => {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: true, // Enable the `X-RateLimit-*` headers
  });

  app.use(limiter);
};
