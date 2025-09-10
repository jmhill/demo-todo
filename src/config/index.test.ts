import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig, createTestConfig } from './index.js';
import { type Secret } from './secrets.js';

describe('Configuration Loading', () => {
  beforeEach(() => {
    // Clear module cache to force re-evaluation of config modules
    vi.resetModules();
  });

  describe('loadConfig', () => {
    it('should load default configuration', () => {
      const config = loadConfig('development');

      expect(config.environment).toBe('development');
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('localhost');
      expect(config.security.cors.enabled).toBe(true);
      expect(config.security.cors.origins).toEqual(['http://localhost:3001']);
      expect(config.security.rateLimiting.enabled).toBe(true);
      expect(config.security.rateLimiting.max).toBe(100);
      expect(config.security.rateLimiting.windowMs).toBe(900000);
    });

    it('should load test configuration with high rate limits', () => {
      const config = loadConfig('test');

      expect(config.environment).toBe('test');
      expect(config.security.rateLimiting.max).toBe(10000); // High limit from test config
      expect(config.security.rateLimiting.windowMs).toBe(60000); // 1 minute from test config
      // Other values should come from default
      expect(config.server.port).toBe(3000);
      expect(config.security.cors.enabled).toBe(true);
    });

    it('should load production configuration with static values', () => {
      // Production config now has static values, not env vars
      // Only secrets (like TEST_SECRET) come from env
      // Mock the TEST_SECRET for production
      vi.stubEnv('TEST_SECRET', 'test-secret-value');

      const config = loadConfig('production');

      expect(config.environment).toBe('production');
      expect(config.server.port).toBe(3000); // Static value from production config
      expect(config.server.host).toBe('0.0.0.0'); // Static value from production config
      expect(config.security.cors.origins).toEqual(['https://myapp.com']); // Static value
      expect(config.security.rateLimiting.max).toBe(50); // Static value
    });

    it('should use NODE_ENV when no environment is specified', () => {
      vi.stubEnv('NODE_ENV', 'test');

      const config = loadConfig();

      expect(config.environment).toBe('test');
      expect(config.security.rateLimiting.max).toBe(10000); // Test config values
    });

    it('should handle missing environment-specific config gracefully', () => {
      const config = loadConfig('nonexistent');

      // Should fall back to default config only
      expect(config.environment).toBe('development');
      expect(config.server.port).toBe(3000);
    });

    it('should load production config successfully when TEST_SECRET is present', () => {
      // Production requires TEST_SECRET from environment
      vi.stubEnv('TEST_SECRET', 'production-secret-value');

      const config = loadConfig('production');

      expect(config.environment).toBe('production');
      expect(config.testSecret).toBe('production-secret-value');
    });
  });

  describe('createTestConfig', () => {
    it('should create test config with base test settings', () => {
      const config = createTestConfig();

      expect(config.environment).toBe('test');
      expect(config.security.rateLimiting.max).toBe(10000);
      expect(config.security.rateLimiting.windowMs).toBe(60000);
      // Should inherit other defaults
      expect(config.server.port).toBe(3000);
      expect(config.security.cors.enabled).toBe(true);
    });

    it('should merge custom overrides with test config', () => {
      const customConfig = createTestConfig({
        server: { port: 8080 },
        security: {
          cors: { origins: ['http://test.local'] },
          rateLimiting: { max: 5 },
        },
      });

      expect(customConfig.environment).toBe('test');
      expect(customConfig.server.port).toBe(8080); // Override
      expect(customConfig.security.cors.origins).toEqual(['http://test.local']); // Override
      expect(customConfig.security.rateLimiting.max).toBe(5); // Override
      expect(customConfig.security.rateLimiting.windowMs).toBe(60000); // From test base
      expect(customConfig.security.cors.enabled).toBe(true); // Default preserved
    });

    it('should handle deep overrides correctly', () => {
      const config = createTestConfig({
        security: {
          rateLimiting: { enabled: false },
          // cors not specified - should keep test defaults
        },
      });

      expect(config.security.rateLimiting.enabled).toBe(false); // Override
      expect(config.security.rateLimiting.max).toBe(10000); // From test base
      expect(config.security.cors.enabled).toBe(true); // From test base
      expect(config.security.cors.origins).toEqual(['http://localhost:3001']); // From test base
    });

    it('should validate custom test configurations', () => {
      expect(() =>
        createTestConfig({
          server: { port: -1 }, // Invalid
        }),
      ).toThrow('Invalid test configuration');
    });

    it('should allow disabling security features for testing', () => {
      const config = createTestConfig({
        security: {
          cors: { enabled: false },
          rateLimiting: { enabled: false },
          requestLimits: { enabled: false },
          secureHeaders: { enabled: false },
        },
      });

      expect(config.security.cors.enabled).toBe(false);
      expect(config.security.rateLimiting.enabled).toBe(false);
      expect(config.security.requestLimits.enabled).toBe(false);
      expect(config.security.secureHeaders.enabled).toBe(false);
    });

    it('should handle nested object overrides properly', () => {
      const config = createTestConfig({
        security: {
          cors: {
            origins: ['http://custom.test'],
            enabled: false,
          },
          rateLimiting: {
            max: 500,
            // windowMs not specified - should keep test default
          },
        },
      });

      expect(config.security.cors.origins).toEqual(['http://custom.test']);
      expect(config.security.cors.enabled).toBe(false);
      expect(config.security.rateLimiting.max).toBe(500);
      expect(config.security.rateLimiting.windowMs).toBe(60000); // Test default
      expect(config.security.rateLimiting.enabled).toBe(true); // Test default
    });
  });

  describe('Dependency injection for secrets', () => {
    it('should use injected secret function instead of environment variables', () => {
      // Create a mock secret function that returns predictable values
      const mockGetSecret = (key: string) => `mock-${key}` as Secret;

      const config = loadConfig('development', mockGetSecret);

      expect(config.environment).toBe('development');
      expect(config.testSecret).toBe('mock-TEST_SECRET');
    });

    it('should allow different secret sources for different environments', () => {
      const vaultSecretFn = (key: string) => `vault-${key}` as Secret;
      const awsSecretFn = (key: string) => `aws-${key}` as Secret;

      const prodConfigWithVault = loadConfig('production', vaultSecretFn);
      const prodConfigWithAws = loadConfig('production', awsSecretFn);

      expect(prodConfigWithVault.testSecret).toBe('vault-TEST_SECRET');
      expect(prodConfigWithAws.testSecret).toBe('aws-TEST_SECRET');
    });
  });

  describe('createTestConfig with dependency injection', () => {
    it('should use injected secret function for test configurations', () => {
      const mockGetSecret = (key: string) => `test-mock-${key}` as Secret;

      const config = createTestConfig({}, mockGetSecret);

      expect(config.environment).toBe('test');
      expect(config.testSecret).toBe('test-mock-TEST_SECRET');
    });

    it('should allow testing different secret scenarios', () => {
      const failingSecretFn = (key: string) => {
        throw new Error(`Secret ${key} not found in test store`);
      };

      expect(() => createTestConfig({}, failingSecretFn)).toThrow(
        'Secret TEST_SECRET not found in test store',
      );
    });
  });
});
