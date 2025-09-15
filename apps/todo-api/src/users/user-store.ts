import type { User } from './user-schemas.js';

export interface UserStore {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  existsByUsername(username: string): Promise<boolean>;
}

export function createInMemoryUserStore(): UserStore {
  const users = new Map<string, User>();
  const emailIndex = new Map<string, string>();
  const usernameIndex = new Map<string, string>();

  return {
    async save(user: User): Promise<void> {
      users.set(user.id, user);
      emailIndex.set(user.email.toLowerCase(), user.id);
      usernameIndex.set(user.username.toLowerCase(), user.id);
    },

    async findById(id: string): Promise<User | null> {
      return users.get(id) ?? null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const userId = emailIndex.get(email.toLowerCase());
      if (!userId) return null;
      return users.get(userId) ?? null;
    },

    async findByUsername(username: string): Promise<User | null> {
      const userId = usernameIndex.get(username.toLowerCase());
      if (!userId) return null;
      return users.get(userId) ?? null;
    },

    async existsByEmail(email: string): Promise<boolean> {
      return emailIndex.has(email.toLowerCase());
    },

    async existsByUsername(username: string): Promise<boolean> {
      return usernameIndex.has(username.toLowerCase());
    },
  };
}
