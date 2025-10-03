// Port: Domain owns this interface, infrastructure implements it
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

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
