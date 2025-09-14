import type { AppConfig } from '../src/config/schema.js';
import type { GetSecretFn } from '../src/config/secrets.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const getConfig = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _getSecretFn: GetSecretFn,
): DeepPartial<AppConfig> => ({
  environment: 'test',
  security: {
    // High rate limits for automated test suites that rapidly hit the API
    rateLimiting: {
      enabled: true,
      windowMs: 60000, // 1 minute
      max: 10000, // High limit for testing - allows rapid automated requests
    },
  },
});
