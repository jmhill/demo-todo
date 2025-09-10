import type { AppConfig } from '../src/config/schema.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const config: DeepPartial<AppConfig> = {
  environment: 'production',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  security: {
    cors: {
      enabled: true,
      origins: ['https://myapp.com'],
    },
    rateLimiting: {
      enabled: true,
      max: 50,
      windowMs: 900000, // 15 minutes
    },
  },
};
