import type { AppConfig } from '../src/config/schema.js';
import type { GetSecretFn } from '../src/config/secrets.js';

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
    rateLimiting: {
      enabled: true,
      windowMs: 900000, // 15 minutes
      max: 100,
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
