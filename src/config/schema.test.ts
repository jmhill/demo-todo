import { describe, it, expect } from 'vitest';
import { configSchema } from './schema.js';

describe('Configuration Schema', () => {
  describe('Valid configuration parsing', () => {
    it('should parse complete valid configuration', () => {
      const validConfig = {
        environment: 'production',
        server: {
          port: 3000,
          host: 'localhost',
        },
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
      };

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

    it('should parse configuration with complete structure and use defaults', () => {
      const configWithStructure = {
        server: {},
        security: {
          cors: {},
          rateLimiting: {},
          requestLimits: {},
          secureHeaders: {},
        },
      };

      const result = configSchema.safeParse(configWithStructure);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toBe('development');
        expect(result.data.server.port).toBe(3000);
        expect(result.data.server.host).toBe('localhost');
        expect(result.data.security.cors.enabled).toBe(true);
        expect(result.data.security.cors.origins).toEqual([
          'http://localhost:3001',
        ]);
        expect(result.data.security.rateLimiting.enabled).toBe(true);
        expect(result.data.security.rateLimiting.max).toBe(100);
        expect(result.data.security.rateLimiting.windowMs).toBe(900000);
      }
    });

    it('should parse test environment configuration', () => {
      const testConfig = {
        environment: 'test',
        server: {},
        security: {
          cors: {},
          rateLimiting: {
            max: 10000,
            windowMs: 60000,
          },
          requestLimits: {},
          secureHeaders: {},
        },
      };

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

  describe('Partial configuration validation', () => {
    it('should allow partial security configuration', () => {
      const partialConfig = {
        server: {},
        security: {
          cors: {
            origins: ['https://myapp.com'],
          },
          rateLimiting: {},
          requestLimits: {},
          secureHeaders: {},
        },
      };

      const result = configSchema.safeParse(partialConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.security.cors.origins).toEqual([
          'https://myapp.com',
        ]);
        expect(result.data.security.cors.enabled).toBe(true); // Default
        expect(result.data.security.rateLimiting.max).toBe(100); // Default
        expect(result.data.security.rateLimiting.enabled).toBe(true); // Default
      }
    });

    it('should allow empty security configuration with all defaults', () => {
      const configWithEmptySecurity = {
        server: {},
        security: {
          cors: {},
          rateLimiting: {},
          requestLimits: {},
          secureHeaders: {},
        },
      };

      const result = configSchema.safeParse(configWithEmptySecurity);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.security.cors.enabled).toBe(true);
        expect(result.data.security.rateLimiting.enabled).toBe(true);
        expect(result.data.security.requestLimits.enabled).toBe(true);
        expect(result.data.security.secureHeaders.enabled).toBe(true);
      }
    });

    it('should allow server configuration with partial values', () => {
      const partialServerConfig = {
        server: {
          port: 8080,
          // host not specified - should use default
        },
        security: {
          cors: {},
          rateLimiting: {},
          requestLimits: {},
          secureHeaders: {},
        },
      };

      const result = configSchema.safeParse(partialServerConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.server.port).toBe(8080);
        expect(result.data.server.host).toBe('localhost'); // Default
      }
    });
  });
});
