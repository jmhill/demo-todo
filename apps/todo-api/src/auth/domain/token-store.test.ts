import { describe, it, expect } from 'vitest';
import { createInMemoryTokenStore } from './token-store.js';

describe('InMemoryTokenStore', () => {
  describe('invalidate', () => {
    it('should mark a token as invalidated', async () => {
      const store = createInMemoryTokenStore();
      const token = 'test-token-123';

      await store.invalidate(token);

      const isInvalidated = await store.isInvalidated(token);
      expect(isInvalidated).toBe(true);
    });

    it('should handle multiple tokens independently', async () => {
      const store = createInMemoryTokenStore();
      const token1 = 'token-1';
      const token2 = 'token-2';

      await store.invalidate(token1);

      expect(await store.isInvalidated(token1)).toBe(true);
      expect(await store.isInvalidated(token2)).toBe(false);
    });
  });

  describe('isInvalidated', () => {
    it('should return false for tokens that have not been invalidated', async () => {
      const store = createInMemoryTokenStore();
      const token = 'never-invalidated';

      const isInvalidated = await store.isInvalidated(token);

      expect(isInvalidated).toBe(false);
    });

    it('should return true for tokens that have been invalidated', async () => {
      const store = createInMemoryTokenStore();
      const token = 'invalidated-token';

      await store.invalidate(token);
      const isInvalidated = await store.isInvalidated(token);

      expect(isInvalidated).toBe(true);
    });
  });
});
