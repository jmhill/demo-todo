import { describe, it, expect, beforeEach } from 'vitest';
import { createUserService } from './user-service.js';
import { createInMemoryUserStore } from './user-store.js';
import type { CreateUserCommand } from './user-schemas.js';

describe('UserService', () => {
  let userService: ReturnType<typeof createUserService>;
  let userStore: ReturnType<typeof createInMemoryUserStore>;

  beforeEach(() => {
    userStore = createInMemoryUserStore();
    userService = createUserService(userStore);
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const command: CreateUserCommand = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      };

      const result = await userService.createUser(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe(command.email);
        expect(result.value.username).toBe(command.username);
        expect(result.value.id).toBeDefined();
        expect(result.value.passwordHash).toBeDefined();
        expect(result.value.passwordHash).not.toBe(command.password);
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should reject user creation with duplicate email', async () => {
      const command: CreateUserCommand = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'SecurePass123!',
      };

      await userService.createUser(command);
      const result = await userService.createUser({
        ...command,
        username: 'user2',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('EMAIL_ALREADY_EXISTS');
      }
    });

    it('should reject user creation with duplicate username', async () => {
      const command: CreateUserCommand = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'SecurePass123!',
      };

      await userService.createUser(command);
      const result = await userService.createUser({
        email: 'user2@example.com',
        username: 'duplicateuser',
        password: 'SecurePass123!',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('USERNAME_ALREADY_EXISTS');
      }
    });
  });

  describe('getById', () => {
    it('should return user when found', async () => {
      const command: CreateUserCommand = {
        email: 'find@example.com',
        username: 'finduser',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(command);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await userService.getById(createResult.value.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(createResult.value.id);
        expect(result.value.email).toBe(command.email);
        expect(result.value.username).toBe(command.username);
      }
    });

    it('should return error when user not found', async () => {
      const result = await userService.getById(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('should return error for invalid UUID format', async () => {
      const result = await userService.getById('invalid-uuid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_USER_ID');
      }
    });
  });

  describe('getByEmail', () => {
    it('should return user when found by email', async () => {
      const command: CreateUserCommand = {
        email: 'findbyemail@example.com',
        username: 'emailuser',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(command);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await userService.getByEmail(command.email);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe(command.email);
        expect(result.value.username).toBe(command.username);
      }
    });

    it('should return error when user not found by email', async () => {
      const result = await userService.getByEmail('nonexistent@example.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });

    it('should return error for invalid email format', async () => {
      const result = await userService.getByEmail('invalid-email');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_EMAIL_FORMAT');
      }
    });
  });

  describe('getByUsername', () => {
    it('should return user when found by username', async () => {
      const command: CreateUserCommand = {
        email: 'findbyusername@example.com',
        username: 'uniqueusername',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(command);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await userService.getByUsername(command.username);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe(command.email);
        expect(result.value.username).toBe(command.username);
      }
    });

    it('should return error when user not found by username', async () => {
      const result = await userService.getByUsername('nonexistentuser');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('USER_NOT_FOUND');
      }
    });
  });
});
