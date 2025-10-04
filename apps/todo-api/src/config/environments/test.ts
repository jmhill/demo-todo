import type { AppConfig } from '../schema.js';
import type { GetSecretFn } from '../secrets.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export const getConfig = (
  getSecretFn: GetSecretFn,
): DeepPartial<AppConfig> => ({
  environment: 'test',
  docSite: {
    enabled:false
  },
  database: {
    // TestContainers will provide these dynamically
    // These are defaults that can be overridden
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: getSecretFn('DB_PASSWORD'),
    database: 'todo_test',
  },
  auth: {
    jwtSecret: getSecretFn('JWT_SECRET'),
    jwtExpiresIn: '1h',
  },
  security: {
    // High rate limits for automated test suites that rapidly hit the API
    rateLimiting: {
      enabled: true,
      windowMs: 60000, // 1 minute
      max: 10000, // High limit for testing - allows rapid automated requests
    },
  },
});
