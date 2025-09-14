import type { AppConfig } from '../schema.js';
import type { GetSecretFn } from '../secrets.js';

export const getConfig = (getSecretFn: GetSecretFn): AppConfig => ({
  environment: 'development',
  server: {
    port: 3000,
    host: 'localhost',
  },
  security: {
    cors: {
      enabled: true,
      origins: ['http://localhost:3001'],
    },
    // Rate limiting disabled in development for unrestricted debugging/testing
    rateLimiting: {
      enabled: false,
      windowMs: 900000, // 15 minutes
      max: 100, // Not used when disabled
    },
    requestLimits: {
      enabled: true,
      jsonLimit: '1mb',
      urlencodedLimit: '1mb',
    },
    secureHeaders: {
      enabled: true,
    },
  },
  testSecret: getSecretFn('TEST_SECRET'), // Will throw if not in .env
});
