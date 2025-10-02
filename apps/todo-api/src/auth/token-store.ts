export interface TokenStore {
  invalidate(token: string): Promise<void>;
  isInvalidated(token: string): Promise<boolean>;
}

export function createInMemoryTokenStore(): TokenStore {
  const invalidatedTokens = new Set<string>();

  return {
    async invalidate(token: string): Promise<void> {
      invalidatedTokens.add(token);
    },

    async isInvalidated(token: string): Promise<boolean> {
      return invalidatedTokens.has(token);
    },
  };
}
