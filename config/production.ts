import type { AppConfig } from '../src/config/schema.js';
import {
  optionalEnvVar,
  parseIntEnv,
  parseArrayEnv,
} from '../src/config/env-utils.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const config: DeepPartial<AppConfig> = {
  environment: 'production',
  server: {
    port: parseIntEnv('PORT', 3000),
    host: optionalEnvVar('HOST', '0.0.0.0'),
  },
  security: {
    cors: {
      enabled: true,
      origins: parseArrayEnv('ALLOWED_ORIGINS', ['https://myapp.com']),
    },
    rateLimiting: {
      enabled: true,
      max: parseIntEnv('RATE_LIMIT_MAX', 50),
      windowMs: parseIntEnv('RATE_LIMIT_WINDOW_MS', 900000),
    },
  },
};
