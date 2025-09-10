import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSecret, getOptionalSecret } from './secrets.js';

describe('Secrets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Start with a clean environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getSecret', () => {
    it('should return value when secret exists', () => {
      process.env.TEST_SECRET = 'secret-value';

      const value = getSecret('TEST_SECRET');

      expect(value).toBe('secret-value');
    });

    it('should throw error when secret does not exist', () => {
      delete process.env.MISSING_SECRET;

      expect(() => getSecret('MISSING_SECRET')).toThrow(
        'Required secret "MISSING_SECRET" not found in environment',
      );
    });

    it('should throw error for empty string values', () => {
      process.env.EMPTY_SECRET = '';

      expect(() => getSecret('EMPTY_SECRET')).toThrow(
        'Required secret "EMPTY_SECRET" not found in environment',
      );
    });
  });

  describe('getOptionalSecret', () => {
    it('should return value when secret exists', () => {
      process.env.OPTIONAL_SECRET = 'optional-value';

      const value = getOptionalSecret('OPTIONAL_SECRET');

      expect(value).toBe('optional-value');
    });

    it('should return undefined when secret does not exist', () => {
      delete process.env.MISSING_OPTIONAL;

      const value = getOptionalSecret('MISSING_OPTIONAL');

      expect(value).toBeUndefined();
    });

    it('should return empty string for empty values', () => {
      process.env.EMPTY_OPTIONAL = '';

      const value = getOptionalSecret('EMPTY_OPTIONAL');

      expect(value).toBe('');
    });
  });
});
