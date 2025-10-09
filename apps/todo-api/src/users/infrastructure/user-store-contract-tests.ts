import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { UserStore } from '../domain/user-service.js';
import type { UserWithHashedPassword } from '../domain/user-schemas.js';

/**
 * Shared contract tests for UserStore implementations.
 *
 * These tests ensure all adapters (Sequelize, MySQL, in-memory) behave identically
 * and implement the UserStore interface contract correctly.
 *
 * Usage:
 * runUserStoreContractTests({
 *   createStore: () => createMyUserStore(),
 *   beforeEach: async () => cleanup(),
 * });
 */
export function runUserStoreContractTests(options: {
  createStore: () => UserStore | Promise<UserStore>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}) {
  let userStore: UserStore;

  beforeEach(async () => {
    if (options.beforeEach) await options.beforeEach();
    userStore = await options.createStore();
  });

  afterEach(async () => {
    if (options.afterEach) await options.afterEach();
  });

  describe('UserStore Contract', () => {
    describe('save', () => {
      it('should save a user with hashed password', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          username: 'testuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);

        const found = await userStore.findById(user.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(user.id);
        expect(found?.email).toBe(user.email);
        expect(found?.username).toBe(user.username);
      });

      it('should store email and username in lowercase', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'Test@Example.com',
          username: 'TestUser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);

        const foundByEmail = await userStore.findByEmail('test@example.com');
        expect(foundByEmail).not.toBeNull();

        const foundByUsername = await userStore.findByUsername('testuser');
        expect(foundByUsername).not.toBeNull();
      });

      it('should update existing user when saving with same id (upsert)', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440002',
          email: 'original@example.com',
          username: 'original',
          passwordHash: 'hash1',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);

        const updated: UserWithHashedPassword = {
          ...user,
          email: 'updated@example.com',
          username: 'updated',
          passwordHash: 'hash2',
          updatedAt: new Date(),
        };

        await userStore.save(updated);

        const found = await userStore.findById(user.id);
        expect(found?.email).toBe('updated@example.com');
        expect(found?.username).toBe('updated');
      });
    });

    describe('findById', () => {
      it('should return user when found', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440003',
          email: 'find@example.com',
          username: 'finduser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findById(user.id);

        expect(found).not.toBeNull();
        expect(found?.id).toBe(user.id);
        expect(found?.email).toBe(user.email);
        expect(found?.username).toBe(user.username);
        expect(found?.createdAt).toBeInstanceOf(Date);
        expect(found?.updatedAt).toBeInstanceOf(Date);
      });

      it('should return null when user not found', async () => {
        const found = await userStore.findById(
          '550e8400-e29b-41d4-a716-446655440099',
        );
        expect(found).toBeNull();
      });

      it('should not return passwordHash', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440004',
          email: 'nopw@example.com',
          username: 'nopwuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findById(user.id);

        expect(found).not.toBeNull();
        expect(found).not.toHaveProperty('passwordHash');
      });
    });

    describe('findByEmail', () => {
      it('should return user when found by email', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440005',
          email: 'findbyemail@example.com',
          username: 'emailuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findByEmail('findbyemail@example.com');

        expect(found).not.toBeNull();
        expect(found?.email).toBe(user.email);
        expect(found?.username).toBe(user.username);
      });

      it('should be case-insensitive', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440006',
          email: 'case@example.com',
          username: 'caseuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findByEmail('CASE@EXAMPLE.COM');

        expect(found).not.toBeNull();
        expect(found?.email).toBe(user.email);
      });

      it('should return null when user not found', async () => {
        const found = await userStore.findByEmail('nonexistent@example.com');
        expect(found).toBeNull();
      });

      it('should not return passwordHash', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440007',
          email: 'emailnopw@example.com',
          username: 'emailnopwuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findByEmail(user.email);

        expect(found).not.toBeNull();
        expect(found).not.toHaveProperty('passwordHash');
      });
    });

    describe('findByUsername', () => {
      it('should return user when found by username', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440008',
          email: 'findbyusername@example.com',
          username: 'uniqueusername',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findByUsername('uniqueusername');

        expect(found).not.toBeNull();
        expect(found?.email).toBe(user.email);
        expect(found?.username).toBe(user.username);
      });

      it('should be case-insensitive', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440009',
          email: 'usernamecase@example.com',
          username: 'caseusername',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findByUsername('CASEUSERNAME');

        expect(found).not.toBeNull();
        expect(found?.username).toBe(user.username);
      });

      it('should return null when user not found', async () => {
        const found = await userStore.findByUsername('nonexistentuser');
        expect(found).toBeNull();
      });

      it('should not return passwordHash', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440010',
          email: 'usernamenopw@example.com',
          username: 'usernamenopwuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found = await userStore.findByUsername(user.username);

        expect(found).not.toBeNull();
        expect(found).not.toHaveProperty('passwordHash');
      });
    });

    describe('findByEmailWithPassword', () => {
      it('should return user with password hash', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440011',
          email: 'withpw@example.com',
          username: 'pwuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found =
          await userStore.findByEmailWithPassword('withpw@example.com');

        expect(found).not.toBeNull();
        expect(found?.passwordHash).toBe('hashed_password_123');
      });

      it('should be case-insensitive', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440012',
          email: 'pwcase@example.com',
          username: 'pwcaseuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found =
          await userStore.findByEmailWithPassword('PWCASE@EXAMPLE.COM');

        expect(found).not.toBeNull();
        expect(found?.passwordHash).toBe('hashed_password_123');
      });

      it('should return null when user not found', async () => {
        const found = await userStore.findByEmailWithPassword(
          'notfound@example.com',
        );
        expect(found).toBeNull();
      });
    });

    describe('findByUsernameWithPassword', () => {
      it('should return user with password hash', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440013',
          email: 'usernamepw@example.com',
          username: 'usernamepwuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found =
          await userStore.findByUsernameWithPassword('usernamepwuser');

        expect(found).not.toBeNull();
        expect(found?.passwordHash).toBe('hashed_password_123');
      });

      it('should be case-insensitive', async () => {
        const now = new Date();
        const user: UserWithHashedPassword = {
          id: '550e8400-e29b-41d4-a716-446655440014',
          email: 'usernamepwcase@example.com',
          username: 'usernamepwcaseuser',
          passwordHash: 'hashed_password_123',
          createdAt: now,
          updatedAt: now,
        };

        await userStore.save(user);
        const found =
          await userStore.findByUsernameWithPassword('USERNAMEPWCASEUSER');

        expect(found).not.toBeNull();
        expect(found?.passwordHash).toBe('hashed_password_123');
      });

      it('should return null when user not found', async () => {
        const found = await userStore.findByUsernameWithPassword('notfound');
        expect(found).toBeNull();
      });
    });
  });
}
