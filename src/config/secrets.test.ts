import { describe, it, expect, vi } from 'vitest';
import { getSecret, getOptionalSecret } from './secrets.js';

describe('Secrets', () => {
  describe('getSecret', () => {
    it('should return value when secret exists', () => {
      vi.stubEnv('TEST_SECRET', 'secret-value');

      const value = getSecret('TEST_SECRET');

      expect(value).toBe('secret-value');
    });

    it('should throw error when secret does not exist', () => {
      vi.stubEnv('MISSING_SECRET', undefined);

      expect(() => getSecret('MISSING_SECRET')).toThrow(
        'Required secret "MISSING_SECRET" not found in environment',
      );
    });

    it('should throw error for empty string values', () => {
      vi.stubEnv('EMPTY_SECRET', '');

      expect(() => getSecret('EMPTY_SECRET')).toThrow(
        'Required secret "EMPTY_SECRET" not found in environment',
      );
    });
  });

  describe('getOptionalSecret', () => {
    it('should return value when secret exists', () => {
      vi.stubEnv('OPTIONAL_SECRET', 'optional-value');

      const value = getOptionalSecret('OPTIONAL_SECRET');

      expect(value).toBe('optional-value');
    });

    it('should return undefined when secret does not exist', () => {
      vi.stubEnv('MISSING_OPTIONAL', undefined);

      const value = getOptionalSecret('MISSING_OPTIONAL');

      expect(value).toBeUndefined();
    });

    it('should return empty string for empty values', () => {
      vi.stubEnv('EMPTY_OPTIONAL', '');

      const value = getOptionalSecret('EMPTY_OPTIONAL');

      expect(value).toBe('');
    });
  });
});
