import { describe, expect, it } from 'vitest';
import { filterSecrets, printEffectiveConfig } from './display.js';
import type { Secret } from './secrets.js';
import { mockGetSecret } from './test-helpers.js';

describe('Configuration Display', () => {
  describe('filterSecrets', () => {
    it('should replace Secret-branded values with [HIDDEN]', () => {
      const config = {
        environment: 'test',
        server: {
          port: 3000,
          host: 'localhost',
        },
        database: {
          password: 'secret-value' as Secret,
        },
      };

      const filtered = filterSecrets(config);

      expect(filtered.database.password).toBe('[HIDDEN]');
      expect(filtered.server.port).toBe(3000);
      expect(filtered.environment).toBe('test');
    });

    it('should handle nested objects with secrets', () => {
      const config = {
        level1: {
          normalValue: 'visible',
          database: {
            password: 'hidden' as Secret,
          },
          level2: {
            auth: {
              jwtSecret: 'also-hidden' as Secret,
            },
            publicValue: 42,
          },
        },
      };

      const filtered = filterSecrets(config);

      expect(filtered.level1.normalValue).toBe('visible');
      expect(filtered.level1.database.password).toBe('[HIDDEN]');
      expect(filtered.level1.level2.auth.jwtSecret).toBe('[HIDDEN]');
      expect(filtered.level1.level2.publicValue).toBe(42);
    });

    it('should handle arrays in configuration', () => {
      const config = {
        origins: ['http://localhost:3000', 'http://localhost:3001'],
        secrets: ['secret1' as Secret, 'secret2' as Secret],
        values: [1, 2, 3],
      };

      const filtered = filterSecrets(config);

      expect(filtered.origins).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
      expect(filtered.secrets).toEqual(['secret1', 'secret2']); // Arrays of secrets are not filtered
      expect(filtered.values).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined values', () => {
      const config = {
        nullValue: null,
        undefinedValue: undefined,
        password: null as unknown as Secret,
        normalString: 'visible',
        database: {
          password: 'secret' as Secret,
        },
      };

      const filtered = filterSecrets(config);

      expect(filtered.nullValue).toBe(null);
      expect(filtered.undefinedValue).toBe(undefined);
      expect(filtered.password).toBe(null); // Not filtered since it's not at a secret path
      expect(filtered.normalString).toBe('visible');
      expect(filtered.database.password).toBe('[HIDDEN]'); // Filtered since it's at database.password
    });

    it('should create a deep copy without modifying original', () => {
      const config = {
        server: {
          port: 3000,
        },
        database: {
          password: 'hidden' as Secret,
        },
      };

      const filtered = filterSecrets(config);
      filtered.server.port = 4000;

      expect(config.server.port).toBe(3000);
      expect(config.database.password).toBe('hidden');
      expect(filtered.database.password).toBe('[HIDDEN]');
    });
  });

  describe('printEffectiveConfig', () => {
    it('should load and print configuration for specified environment', () => {
      const output = printEffectiveConfig('test', mockGetSecret);

      expect(output).toContain('"environment": "test"');
      expect(output).toContain('"password": "[HIDDEN]"');
      expect(output).toContain('"jwtSecret": "[HIDDEN]"');
      expect(output).not.toContain('mock-db-password');
      expect(output).not.toContain('mock-jwt-secret-for-testing-only');
    });

    it('should use NODE_ENV when environment not specified', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const output = printEffectiveConfig(undefined, mockGetSecret);

      expect(output).toContain('"environment": "test"');

      process.env.NODE_ENV = originalEnv;
    });

    it('should format output as readable JSON', () => {
      const output = printEffectiveConfig('development', mockGetSecret);

      expect(() => JSON.parse(output)).not.toThrow();

      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('environment');
      expect(parsed).toHaveProperty('server');
      expect(parsed).toHaveProperty('security');
    });

    it('should handle configuration loading errors gracefully', () => {
      const mockGetSecret = () => {
        throw new Error('Secret loading failed');
      };

      expect(() => printEffectiveConfig('test', mockGetSecret)).toThrow(
        'Secret loading failed',
      );
    });
  });
});
