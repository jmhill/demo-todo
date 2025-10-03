import { describe, it, expect } from 'vitest';
import { createTestConfig } from './index.js';
import { mockGetSecret } from './test-helpers.js';

describe('createTestConfig Function', () => {
  describe('Base test configuration', () => {
    it('should provide high rate limits suitable for testing', () => {
      const config = createTestConfig({}, mockGetSecret);

      expect(config.environment).toBe('test');
      expect(config.security.rateLimiting.max).toBe(10000); // High limit
      expect(config.security.rateLimiting.windowMs).toBe(60000); // 1 minute window
      expect(config.security.rateLimiting.enabled).toBe(true);
    });

    it('should inherit sensible defaults for all other settings', () => {
      const config = createTestConfig({}, mockGetSecret);

      expect(config.server.port).toBe(3000);
      expect(config.server.host).toBe('localhost');
      expect(config.security.cors.enabled).toBe(true);
      expect(config.security.cors.origins).toEqual(['http://localhost:5173']);
      expect(config.security.requestLimits.enabled).toBe(true);
      expect(config.security.requestLimits.jsonLimit).toBe('1mb');
      expect(config.security.secureHeaders.enabled).toBe(true);
    });
  });

  describe('Custom overrides for different test scenarios', () => {
    it('should allow creating config for rate limiting tests', () => {
      const rateLimitTestConfig = createTestConfig(
        {
          security: {
            rateLimiting: {
              windowMs: 60000, // 1 minute
              max: 10, // Low limit for testing rate limiting
            },
          },
        },
        mockGetSecret,
      );

      expect(rateLimitTestConfig.security.rateLimiting.max).toBe(10);
      expect(rateLimitTestConfig.security.rateLimiting.windowMs).toBe(60000);
      expect(rateLimitTestConfig.security.rateLimiting.enabled).toBe(true);

      // Other settings should remain unchanged
      expect(rateLimitTestConfig.security.cors.enabled).toBe(true);
      expect(rateLimitTestConfig.server.port).toBe(3000);
    });

    it('should allow creating config for CORS tests', () => {
      const corsTestConfig = createTestConfig(
        {
          security: {
            cors: {
              origins: ['http://test1.com', 'http://test2.com'],
            },
          },
        },
        mockGetSecret,
      );

      expect(corsTestConfig.security.cors.origins).toEqual([
        'http://test1.com',
        'http://test2.com',
      ]);
      expect(corsTestConfig.security.cors.enabled).toBe(true);

      // Rate limiting should keep test defaults
      expect(corsTestConfig.security.rateLimiting.max).toBe(10000);
    });

    it('should allow creating config for request limit tests', () => {
      const requestLimitTestConfig = createTestConfig(
        {
          security: {
            requestLimits: {
              jsonLimit: '500kb',
              urlencodedLimit: '200kb',
            },
          },
        },
        mockGetSecret,
      );

      expect(requestLimitTestConfig.security.requestLimits.jsonLimit).toBe(
        '500kb',
      );
      expect(
        requestLimitTestConfig.security.requestLimits.urlencodedLimit,
      ).toBe('200kb');
      expect(requestLimitTestConfig.security.requestLimits.enabled).toBe(true);
    });

    it('should allow disabling specific security features for tests', () => {
      const disabledSecurityConfig = createTestConfig(
        {
          security: {
            cors: { enabled: false },
            rateLimiting: { enabled: false },
          },
        },
        mockGetSecret,
      );

      expect(disabledSecurityConfig.security.cors.enabled).toBe(false);
      expect(disabledSecurityConfig.security.rateLimiting.enabled).toBe(false);

      // Other features should remain enabled
      expect(disabledSecurityConfig.security.requestLimits.enabled).toBe(true);
      expect(disabledSecurityConfig.security.secureHeaders.enabled).toBe(true);
    });

    it('should allow complete security configuration override', () => {
      const customSecurityConfig = createTestConfig(
        {
          security: {
            cors: {
              enabled: true,
              origins: ['http://custom-test.local'],
            },
            rateLimiting: {
              enabled: true,
              windowMs: 30000,
              max: 5,
            },
            requestLimits: {
              enabled: true,
              jsonLimit: '2mb',
              urlencodedLimit: '1mb',
            },
            secureHeaders: {
              enabled: false,
            },
          },
        },
        mockGetSecret,
      );

      expect(customSecurityConfig.security.cors.origins).toEqual([
        'http://custom-test.local',
      ]);
      expect(customSecurityConfig.security.rateLimiting.max).toBe(5);
      expect(customSecurityConfig.security.rateLimiting.windowMs).toBe(30000);
      expect(customSecurityConfig.security.requestLimits.jsonLimit).toBe('2mb');
      expect(customSecurityConfig.security.secureHeaders.enabled).toBe(false);
    });

    it('should allow server configuration for integration tests', () => {
      const integrationTestConfig = createTestConfig(
        {
          server: {
            port: 8080, // Use specific port (0 not allowed by schema)
            host: '127.0.0.1',
          },
        },
        mockGetSecret,
      );

      expect(integrationTestConfig.server.port).toBe(8080);
      expect(integrationTestConfig.server.host).toBe('127.0.0.1');
    });
  });

  describe('Validation and error handling', () => {
    it('should validate custom test configurations', () => {
      expect(() =>
        createTestConfig(
          {
            server: {
              port: -1, // Invalid port
            },
          },
          mockGetSecret,
        ),
      ).toThrow('Invalid test configuration');
    });

    it('should validate security configuration overrides', () => {
      expect(() =>
        createTestConfig(
          {
            security: {
              rateLimiting: {
                max: -10, // Invalid negative value
              },
            },
          },
          mockGetSecret,
        ),
      ).toThrow('Invalid test configuration');
    });

    it('should validate environment enum constraints', () => {
      expect(() =>
        createTestConfig(
          {
            environment: 'invalid-environment' as 'development',
          },
          mockGetSecret,
        ),
      ).toThrow('Invalid test configuration');
    });

    it('should validate CORS origins format', () => {
      expect(() =>
        createTestConfig(
          {
            security: {
              cors: {
                origins: [123, null] as unknown as string[],
              },
            },
          },
          mockGetSecret,
        ),
      ).toThrow('Invalid test configuration');
    });
  });

  describe('Common test configuration patterns', () => {
    it('should create config for acceptance tests with high limits', () => {
      const acceptanceConfig = createTestConfig(
        {
          security: {
            rateLimiting: {
              max: 50000, // Very high for acceptance tests
              windowMs: 300000, // 5 minute window
            },
          },
        },
        mockGetSecret,
      );

      expect(acceptanceConfig.security.rateLimiting.max).toBe(50000);
      expect(acceptanceConfig.security.rateLimiting.windowMs).toBe(300000);
    });

    it('should create config for load testing simulation', () => {
      const loadTestConfig = createTestConfig(
        {
          security: {
            rateLimiting: {
              max: 1, // Very restrictive for testing overload scenarios
              windowMs: 1000, // 1 second window
            },
            cors: {
              origins: ['http://load-test.local'],
            },
          },
        },
        mockGetSecret,
      );

      expect(loadTestConfig.security.rateLimiting.max).toBe(1);
      expect(loadTestConfig.security.rateLimiting.windowMs).toBe(1000);
      expect(loadTestConfig.security.cors.origins).toEqual([
        'http://load-test.local',
      ]);
    });

    it('should create config for security feature testing', () => {
      const securityTestConfig = createTestConfig(
        {
          security: {
            cors: {
              origins: [], // No allowed origins for testing blocked requests
            },
            requestLimits: {
              jsonLimit: '100b', // Very small limit for testing payload restrictions
              urlencodedLimit: '50b',
            },
          },
        },
        mockGetSecret,
      );

      expect(securityTestConfig.security.cors.origins).toEqual([]);
      expect(securityTestConfig.security.requestLimits.jsonLimit).toBe('100b');
      expect(securityTestConfig.security.requestLimits.urlencodedLimit).toBe(
        '50b',
      );
    });
  });

  describe('Type safety and development experience', () => {
    it('should provide full type safety for nested overrides', () => {
      // This test verifies that TypeScript compilation succeeds with proper typing
      const config = createTestConfig(
        {
          server: {
            port: 8080,
            host: 'localhost',
          },
          security: {
            cors: {
              enabled: true,
              origins: ['http://example.com'],
            },
            rateLimiting: {
              enabled: true,
              windowMs: 60000,
              max: 100,
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
          environment: 'test',
        },
        mockGetSecret,
      );

      // Verify all properties exist and have correct types
      expect(typeof config.server.port).toBe('number');
      expect(typeof config.server.host).toBe('string');
      expect(typeof config.security.cors.enabled).toBe('boolean');
      expect(Array.isArray(config.security.cors.origins)).toBe(true);
      expect(typeof config.security.rateLimiting.max).toBe('number');
      expect(typeof config.environment).toBe('string');
    });
  });
});
