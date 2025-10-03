import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeUserStore } from './user-store-sequelize.js';
import type { UserWithHashedPassword } from '../domain/user-schemas.js';
import type { Secret } from '../../config/secrets.js';

describe('SequelizeUserStore', () => {
  let sequelize: Sequelize;
  let userStore: ReturnType<typeof createSequelizeUserStore>;

  beforeAll(async () => {
    // Connect to MySQL testcontainer (started by global setup)
    const host = process.env.TEST_DB_HOST;
    const port = process.env.TEST_DB_PORT;
    const user = process.env.TEST_DB_USER;
    const password = process.env.TEST_DB_PASSWORD;
    const database = process.env.TEST_DB_DATABASE;

    if (!host || !port || !user || !password || !database) {
      throw new Error(
        'Database config not found in environment. ' +
          'Make sure tests are running with globalSetup configured.',
      );
    }

    sequelize = new Sequelize({
      dialect: 'mysql',
      host,
      port: parseInt(port, 10),
      username: user,
      password: password as Secret,
      database,
      logging: false,
    });

    // Migrations already run by global setup
  });

  beforeEach(async () => {
    // Clean database before each test
    await sequelize.getQueryInterface().bulkDelete('users', {});

    // Recreate store instance
    userStore = createSequelizeUserStore(sequelize);
  });

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
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const now = new Date();
      const user: UserWithHashedPassword = {
        id: '550e8400-e29b-41d4-a716-446655440002',
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
        id: '550e8400-e29b-41d4-a716-446655440003',
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
        id: '550e8400-e29b-41d4-a716-446655440004',
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
        id: '550e8400-e29b-41d4-a716-446655440005',
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
        id: '550e8400-e29b-41d4-a716-446655440006',
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
        id: '550e8400-e29b-41d4-a716-446655440007',
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
        id: '550e8400-e29b-41d4-a716-446655440008',
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
        id: '550e8400-e29b-41d4-a716-446655440009',
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
});
