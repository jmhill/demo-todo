import type { AppConfig } from '../src/config/schema.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const config: DeepPartial<AppConfig> = {
  environment: 'test',
  security: {
    rateLimiting: {
      enabled: true,
      windowMs: 60000, // 1 minute
      max: 10000, // High limit for testing
    },
  },
};
