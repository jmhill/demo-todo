import { describe, it, expect } from 'vitest';
import { configSchema } from './schema.js';
import { createTestConfig } from './index.js';
import { mockGetSecret } from './test-helpers.js';

describe('Configuration Schema', () => {
  describe('Valid configuration parsing', () => {
    it('should parse complete valid configuration', () => {
      const validConfig = createTestConfig(
        {
          environment: 'production',
          security: {
            cors: {
              enabled: true,
              origins: ['http://localhost:3001', 'https://example.com'],
            },
            rateLimiting: {
              enabled: true,
              windowMs: 900000,
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
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(validConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toBe('production');
        expect(result.data.server.port).toBe(3000);
        expect(result.data.security.cors.origins).toEqual([
          'http://localhost:3001',
          'https://example.com',
        ]);
      }
    });

    it('should parse configuration with optional testSecret', () => {
      const configWithSecret = createTestConfig(
        {
          testSecret: 'test-secret-value',
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(configWithSecret);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.testSecret).toBe('test-secret-value');
      }
    });

    it('should parse configuration with required testSecret', () => {
      const configWithRequiredSecret = createTestConfig(
        {
          testSecret: 'another-test-secret-value',
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(configWithRequiredSecret);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.testSecret).toBe('another-test-secret-value');
      }
    });

    it('should parse configuration with complete structure', () => {
      const configWithStructure = createTestConfig({}, mockGetSecret);

      const result = configSchema.safeParse(configWithStructure);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toBe('test');
        expect(result.data.server.port).toBe(3000);
        expect(result.data.server.host).toBe('localhost');
        expect(result.data.security.cors.enabled).toBe(true);
        expect(result.data.security.cors.origins).toEqual([
          'http://localhost:3001',
        ]);
        expect(result.data.security.rateLimiting.enabled).toBe(true);
        expect(result.data.security.rateLimiting.max).toBe(10000);
        expect(result.data.security.rateLimiting.windowMs).toBe(60000);
      }
    });

    it('should parse test environment configuration', () => {
      const testConfig = createTestConfig(
        {
          environment: 'test',
          security: {
            cors: {
              enabled: true,
              origins: ['http://localhost:3001'],
            },
            rateLimiting: {
              enabled: true,
              max: 10000,
              windowMs: 60000,
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
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(testConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toBe('test');
        expect(result.data.security.rateLimiting.max).toBe(10000);
        expect(result.data.security.rateLimiting.windowMs).toBe(60000);
        // Should still have defaults for other fields
        expect(result.data.server.port).toBe(3000);
        expect(result.data.security.cors.enabled).toBe(true);
      }
    });
  });

  describe('Invalid configuration validation', () => {
    it('should reject invalid environment', () => {
      const invalidConfig = {
        environment: 'invalid-env',
        server: {},
        security: {
          cors: {},
          rateLimiting: {},
          requestLimits: {},
          secureHeaders: {},
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['environment'],
              code: 'invalid_value',
            }),
          ]),
        );
      }
    });

    it('should reject negative server port', () => {
      const invalidConfig = {
        server: {
          port: -1,
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['server', 'port'],
              code: 'too_small',
            }),
          ]),
        );
      }
    });

    it('should reject zero server port', () => {
      const invalidConfig = {
        server: {
          port: 0,
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['server', 'port'],
              code: 'too_small',
            }),
          ]),
        );
      }
    });

    it('should reject negative rate limiting values', () => {
      const invalidConfig = {
        security: {
          rateLimiting: {
            max: -10,
            windowMs: -1000,
          },
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['security', 'rateLimiting', 'max'],
              code: 'too_small',
            }),
            expect.objectContaining({
              path: ['security', 'rateLimiting', 'windowMs'],
              code: 'too_small',
            }),
          ]),
        );
      }
    });

    it('should reject zero rate limiting values', () => {
      const invalidConfig = {
        security: {
          rateLimiting: {
            max: 0,
            windowMs: 0,
          },
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
    });

    it('should reject invalid CORS origins format', () => {
      const invalidConfig = {
        security: {
          cors: {
            origins: ['not-a-valid-url', 123, null],
          },
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['security', 'cors', 'origins', 1],
            }),
          ]),
        );
      }
    });

    it('should reject invalid boolean values for enabled flags', () => {
      const invalidConfig = {
        security: {
          cors: {
            enabled: 'yes', // Should be boolean
          },
          rateLimiting: {
            enabled: 1, // Should be boolean
          },
        },
      };

      const result = configSchema.safeParse(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['security', 'cors', 'enabled'],
              code: 'invalid_type',
            }),
            expect.objectContaining({
              path: ['security', 'rateLimiting', 'enabled'],
              code: 'invalid_type',
            }),
          ]),
        );
      }
    });
  });

  describe('Complete configuration validation', () => {
    it('should validate complete configuration with custom security settings', () => {
      const customConfig = createTestConfig(
        {
          security: {
            cors: {
              enabled: true,
              origins: ['https://myapp.com'],
            },
            rateLimiting: {
              enabled: true,
              windowMs: 900000,
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
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(customConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.security.cors.origins).toEqual([
          'https://myapp.com',
        ]);
        expect(result.data.security.cors.enabled).toBe(true);
        expect(result.data.security.rateLimiting.max).toBe(100);
        expect(result.data.security.rateLimiting.enabled).toBe(true);
      }
    });

    it('should validate complete configuration with all security features enabled', () => {
      const configWithAllSecurity = createTestConfig({}, mockGetSecret);

      const result = configSchema.safeParse(configWithAllSecurity);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.security.cors.enabled).toBe(true);
        expect(result.data.security.rateLimiting.enabled).toBe(true);
        expect(result.data.security.requestLimits.enabled).toBe(true);
        expect(result.data.security.secureHeaders.enabled).toBe(true);
      }
    });

    it('should validate complete configuration with custom server settings', () => {
      const customServerConfig = createTestConfig(
        {
          server: {
            port: 8080,
            host: '0.0.0.0',
          },
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(customServerConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server.port).toBe(8080);
        expect(result.data.server.host).toBe('0.0.0.0');
      }
    });
  });

  describe('Secret type validation', () => {
    it('should enforce Secret schema for testSecret field', () => {
      // Create a valid config first, then modify it to have an invalid secret
      const baseConfig = createTestConfig({}, mockGetSecret);
      const configWithEmptySecret = {
        ...baseConfig,
        testSecret: '', // Empty string should fail
      };

      const result = configSchema.safeParse(configWithEmptySecret);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['testSecret'],
              message:
                'Secret must be a non-empty string obtained via getSecret() or getOptionalSecret()',
            }),
          ]),
        );
      }
    });

    it('should accept valid secret strings for testSecret field', () => {
      const configWithValidSecret = createTestConfig(
        {
          testSecret: 'valid-secret-from-env',
        },
        mockGetSecret,
      );

      const result = configSchema.safeParse(configWithValidSecret);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.testSecret).toBe('valid-secret-from-env');
      }
    });
  });
});
