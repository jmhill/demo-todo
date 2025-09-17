import type { GetSecretFn, Secret } from './secrets.js';

/**
 * Mock secret function for unit tests that don't need real secrets
 */
export const mockGetSecret: GetSecretFn = (key: string) => {
  const mockSecrets: Record<string, string> = {
    TEST_SECRET: 'mock-TEST_SECRET',
    DB_PASSWORD: 'mock-db-password',
  };
  return (mockSecrets[key] as Secret) || (`mock-${key}` as Secret);
};
