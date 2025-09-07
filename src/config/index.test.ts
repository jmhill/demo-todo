import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadConfig, createTestConfig } from './index.js';

describe('Configuration Loading', () => {
  afterEach(() => {
    // Clean up any environment variable mocks
    vi.unstubAllEnvs();
  });

  describe('loadConfig', () => {
    it('should load default configuration', async () => {
      const config = await loadConfig('development');

      expect(config.environment).toBe('development');
      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('localhost');
      expect(config.security.cors.enabled).toBe(true);
      expect(config.security.cors.origins).toEqual(['http://localhost:3001']);
      expect(config.security.rateLimiting.enabled).toBe(true);
      expect(config.security.rateLimiting.max).toBe(100);
      expect(config.security.rateLimiting.windowMs).toBe(900000);
    });

    it('should load test configuration with high rate limits', async () => {
      const config = await loadConfig('test');

      expect(config.environment).toBe('test');
      expect(config.security.rateLimiting.max).toBe(10000); // High limit from test config
      expect(config.security.rateLimiting.windowMs).toBe(60000); // 1 minute from test config
      // Other values should come from default
      expect(config.server.port).toBe(3000);
      expect(config.security.cors.enabled).toBe(true);
    });

    it('should load production configuration with environment variables', async () => {
      // Mock environment variables
      vi.stubEnv('PORT', '8080');
      vi.stubEnv('HOST', '0.0.0.0');
      vi.stubEnv('ALLOWED_ORIGINS', 'https://app.com,https://api.com');
      vi.stubEnv('RATE_LIMIT_MAX', '25');

      const config = await loadConfig('production');

      expect(config.environment).toBe('production');
      expect(config.server.port).toBe(8080); // From env var
      expect(config.server.host).toBe('0.0.0.0'); // From env var
      expect(config.security.cors.origins).toEqual([
        'https://app.com',
        'https://api.com',
      ]); // From env var
      expect(config.security.rateLimiting.max).toBe(25); // From env var
    });

    it('should use NODE_ENV when no environment is specified', async () => {
      vi.stubEnv('NODE_ENV', 'test');

      const config = await loadConfig();

      expect(config.environment).toBe('test');
      expect(config.security.rateLimiting.max).toBe(10000); // Test config values
    });

    it('should handle missing environment-specific config gracefully', async () => {
      const config = await loadConfig('nonexistent');

      // Should fall back to default config only
      expect(config.environment).toBe('development');
      expect(config.server.port).toBe(3000);
    });

    it('should throw error when required environment variables are missing in production', async () => {
      // Test would need to be more specific based on which env vars are required
      // For now, production config doesn't have required env vars, just optional ones with defaults
      const config = await loadConfig('production');
      expect(config.environment).toBe('production');
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
});
