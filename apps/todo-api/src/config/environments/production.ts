import type { AppConfig } from '../schema.js';
import type { GetSecretFn } from '../secrets.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const getConfig = (
  getSecretFn: GetSecretFn,
): DeepPartial<AppConfig> => ({
  environment: 'production',
  docSite: {
    enabled: false,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  auth: {
    jwtSecret: getSecretFn('JWT_SECRET'),
    jwtExpiresIn: '24h',
  },
  security: {
    cors: {
      enabled: true,
      origins: ['https://myapp.com'],
    },
    // Production rate limiting: allows ~200 requests/minute for normal user activity
    // while protecting against abuse
    rateLimiting: {
      enabled: true,
      max: 3000, // 3000 requests per 15 minutes = ~200/minute
      windowMs: 900000, // 15 minutes
    },
  },
});
