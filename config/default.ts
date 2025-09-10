import type { AppConfig } from '../src/config/schema.js';
import { getSecret } from '../src/config/secrets.js';

export const config: AppConfig = {
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
  testSecret: getSecret('TEST_SECRET'), // Will throw if not in .env
};
