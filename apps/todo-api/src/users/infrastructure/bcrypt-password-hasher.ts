import bcrypt from 'bcrypt';
import type { PasswordHasher } from '../domain/password-hasher.js';

const SALT_ROUNDS = 10;

// Adapter: Implements domain port using bcrypt library
export function createBcryptPasswordHasher(): PasswordHasher {
  return {
    async hash(password: string): Promise<string> {
      return bcrypt.hash(password, SALT_ROUNDS);
    },
    async compare(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    },
  };
}
