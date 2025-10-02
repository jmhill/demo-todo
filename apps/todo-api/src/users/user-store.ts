import type { User, UserWithHashedPassword } from './user-schemas.js';

export interface UserStore {
  save(user: UserWithHashedPassword): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findByEmailWithPassword(
    email: string,
  ): Promise<UserWithHashedPassword | null>;
  findByUsernameWithPassword(
    username: string,
  ): Promise<UserWithHashedPassword | null>;
}

export function createInMemoryUserStore(): UserStore {
  const users = new Map<string, UserWithHashedPassword>();
  const emailIndex = new Map<string, string>();
  const usernameIndex = new Map<string, string>();

  const toUser = (userWithPassword: UserWithHashedPassword): User => ({
    id: userWithPassword.id,
    email: userWithPassword.email,
    username: userWithPassword.username,
    createdAt: userWithPassword.createdAt,
    updatedAt: userWithPassword.updatedAt,
  });

  return {
    async save(user: UserWithHashedPassword): Promise<void> {
      users.set(user.id, user);
      emailIndex.set(user.email.toLowerCase(), user.id);
      usernameIndex.set(user.username.toLowerCase(), user.id);
    },

    async findById(id: string): Promise<User | null> {
      const userWithPassword = users.get(id);
      return userWithPassword ? toUser(userWithPassword) : null;
    },

    async findByEmail(email: string): Promise<User | null> {
      const userId = emailIndex.get(email.toLowerCase());
      if (!userId) return null;
      const userWithPassword = users.get(userId);
      return userWithPassword ? toUser(userWithPassword) : null;
    },

    async findByUsername(username: string): Promise<User | null> {
      const userId = usernameIndex.get(username.toLowerCase());
      if (!userId) return null;
      const userWithPassword = users.get(userId);
      return userWithPassword ? toUser(userWithPassword) : null;
    },

    async findByEmailWithPassword(
      email: string,
    ): Promise<UserWithHashedPassword | null> {
      const userId = emailIndex.get(email.toLowerCase());
      if (!userId) return null;
      return users.get(userId) ?? null;
    },

    async findByUsernameWithPassword(
      username: string,
    ): Promise<UserWithHashedPassword | null> {
      const userId = usernameIndex.get(username.toLowerCase());
      if (!userId) return null;
      return users.get(userId) ?? null;
    },
  };
}
