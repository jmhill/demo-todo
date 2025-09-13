import { describe, expect, it } from 'vitest';
import { filterSecrets, printEffectiveConfig } from './display.js';
import type { Secret } from './secrets.js';

describe('Configuration Display', () => {
  describe('filterSecrets', () => {
    it('should replace Secret-branded values with [HIDDEN]', () => {
      const config = {
        environment: 'test',
        server: {
          port: 3000,
          host: 'localhost',
        },
        testSecret: 'secret-value' as Secret,
      };

      const filtered = filterSecrets(config);

      expect(filtered.testSecret).toBe('[HIDDEN]');
      expect(filtered.server.port).toBe(3000);
      expect(filtered.environment).toBe('test');
    });

    it('should handle nested objects with secrets', () => {
      const config = {
        level1: {
          normalValue: 'visible',
          testSecret: 'hidden' as Secret,
          level2: {
            testSecret: 'also-hidden' as Secret,
            publicValue: 42,
          },
        },
      };

      const filtered = filterSecrets(config);

      expect(filtered.level1.normalValue).toBe('visible');
      expect(filtered.level1.testSecret).toBe('[HIDDEN]');
      expect(filtered.level1.level2.testSecret).toBe('[HIDDEN]');
      expect(filtered.level1.level2.publicValue).toBe(42);
    });

    it('should handle arrays in configuration', () => {
      const config = {
        origins: ['http://localhost:3000', 'http://localhost:3001'],
        testSecret: ['secret1' as Secret, 'secret2' as Secret],
        values: [1, 2, 3],
      };

      const filtered = filterSecrets(config);

      expect(filtered.origins).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
      expect(filtered.testSecret).toBe('[HIDDEN]');
      expect(filtered.values).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined values', () => {
      const config = {
        nullValue: null,
        undefinedValue: undefined,
        testSecret: null as unknown as Secret,
        normalString: 'visible',
      };

      const filtered = filterSecrets(config);

      expect(filtered.nullValue).toBe(null);
      expect(filtered.undefinedValue).toBe(undefined);
      expect(filtered.testSecret).toBe('[HIDDEN]');
      expect(filtered.normalString).toBe('visible');
    });

    it('should create a deep copy without modifying original', () => {
      const config = {
        server: {
          port: 3000,
        },
        testSecret: 'hidden' as Secret,
      };

      const filtered = filterSecrets(config);
      filtered.server.port = 4000;

      expect(config.server.port).toBe(3000);
      expect(config.testSecret).toBe('hidden');
      expect(filtered.testSecret).toBe('[HIDDEN]');
    });
  });

  describe('printEffectiveConfig', () => {
    it('should load and print configuration for specified environment', () => {
      const mockGetSecret = (key: string) => {
        if (key === 'TEST_SECRET') {
          return 'test-secret-value' as Secret;
        }
        throw new Error(`Secret ${key} not found`);
      };

      const output = printEffectiveConfig('test', mockGetSecret);

      expect(output).toContain('"environment": "test"');
      expect(output).toContain('"testSecret": "[HIDDEN]"');
      expect(output).not.toContain('test-secret-value');
    });

    it('should use NODE_ENV when environment not specified', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockGetSecret = (key: string) => {
        if (key === 'TEST_SECRET') {
          return 'test-secret-value' as Secret;
        }
        throw new Error(`Secret ${key} not found`);
      };

      const output = printEffectiveConfig(undefined, mockGetSecret);

      expect(output).toContain('"environment": "test"');

      process.env.NODE_ENV = originalEnv;
    });

    it('should format output as readable JSON', () => {
      const mockGetSecret = (key: string) => {
        if (key === 'TEST_SECRET') {
          return 'test-secret-value' as Secret;
        }
        throw new Error(`Secret ${key} not found`);
      };

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
