import { describe, it, expect, vi } from 'vitest';
import { getSecret, secretSchema } from './secrets.js';

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

  describe('secretSchema', () => {
    it('should validate Secret types from getSecret', () => {
      vi.stubEnv('VALID_SECRET', 'valid-secret-value');

      const secret = getSecret('VALID_SECRET');
      const result = secretSchema.safeParse(secret);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('valid-secret-value');
      }
    });

    it('should reject empty strings', () => {
      const result = secretSchema.safeParse('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Secret must be a non-empty string obtained via getSecret() or getOptionalSecret()',
        );
      }
    });

    it('should reject non-string types', () => {
      const result = secretSchema.safeParse(123);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          'Secret must be a non-empty string obtained via getSecret() or getOptionalSecret()',
        );
      }
    });

    it('should provide type safety for Secret branded type', () => {
      vi.stubEnv('TYPE_TEST_SECRET', 'type-test-value');

      // This demonstrates the compile-time type safety
      const secret = getSecret('TYPE_TEST_SECRET');
      const result = secretSchema.safeParse(secret);

      expect(result.success).toBe(true);
      // The returned type is Secret, not string
      if (result.success) {
        // TypeScript knows this is a Secret type, not just string
        expect(typeof result.data).toBe('string');
      }
    });
  });
});
