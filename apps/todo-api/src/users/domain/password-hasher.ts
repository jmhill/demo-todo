import type { PasswordHasher } from './user-service.js';

// Test implementation for use in tests - NO REAL HASHING
export function createMockPasswordHasher(): PasswordHasher {
  return {
    async hash(password: string): Promise<string> {
      return `hashed_${password}`;
    },
    async compare(password: string, hash: string): Promise<boolean> {
      return hash === `hashed_${password}`;
    },
  };
}
