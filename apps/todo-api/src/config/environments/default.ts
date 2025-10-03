import type { AppConfig } from '../schema.js';
import type { GetSecretFn } from '../secrets.js';

export const getConfig = (getSecretFn: GetSecretFn): AppConfig => ({
  environment: 'development',
  server: {
    port: 3000,
    host: 'localhost',
  },
  database: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: getSecretFn('DB_PASSWORD'),
    database: 'todo_dev',
  },
  auth: {
    jwtSecret: getSecretFn('JWT_SECRET'),
    jwtExpiresIn: '24h',
  },
  security: {
    cors: {
      enabled: true,
      origins: ['http://localhost:5173'], // Vite dev server
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
});
