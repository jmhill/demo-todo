import { describe, it, expect, beforeEach } from 'vitest';
import { createUserService } from './user-service.js';
import { createInMemoryUserStore } from './user-store.js';
import type { CreateUserDto } from './user-schemas.js';

describe('UserService', () => {
  let userService: ReturnType<typeof createUserService>;
  let userStore: ReturnType<typeof createInMemoryUserStore>;

  beforeEach(() => {
    userStore = createInMemoryUserStore();
    userService = createUserService(userStore);
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'SecurePass123!',
      };

      const result = await userService.createUser(createUserDto);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe(createUserDto.email);
        expect(result.value.username).toBe(createUserDto.username);
        expect(result.value.id).toBeDefined();
        expect(result.value.passwordHash).toBeDefined();
        expect(result.value.passwordHash).not.toBe(createUserDto.password);
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should reject user creation with duplicate email', async () => {
      const createUserDto: CreateUserDto = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'SecurePass123!',
      };

      await userService.createUser(createUserDto);
      const result = await userService.createUser({
        ...createUserDto,
        username: 'user2',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('email already exists');
      }
    });

    it('should reject user creation with duplicate username', async () => {
      const createUserDto: CreateUserDto = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'SecurePass123!',
      };

      await userService.createUser(createUserDto);
      const result = await userService.createUser({
        email: 'user2@example.com',
        username: 'duplicateuser',
        password: 'SecurePass123!',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('username already exists');
      }
    });

    it('should reject user creation with invalid email', async () => {
      const createUserDto = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'SecurePass123!',
      };

      const result = await userService.createUser(createUserDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Validation failed');
        expect(result.error.message).toContain('email');
      }
    });

    it('should reject user creation with short password', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
      };

      const result = await userService.createUser(createUserDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Validation failed');
        expect(result.error.message).toContain('password');
      }
    });

    it('should reject user creation with short username', async () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'ab',
        password: 'SecurePass123!',
      };

      const result = await userService.createUser(createUserDto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Validation failed');
        expect(result.error.message).toContain('username');
      }
    });
  });

  describe('getById', () => {
    it('should return user when found', async () => {
      const createUserDto: CreateUserDto = {
        email: 'find@example.com',
        username: 'finduser',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(createUserDto);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await userService.getById(createResult.value.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(createResult.value.id);
        expect(result.value.email).toBe(createUserDto.email);
        expect(result.value.username).toBe(createUserDto.username);
      }
    });

    it('should return error when user not found', async () => {
      const result = await userService.getById(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('User not found');
      }
    });

    it('should return error for invalid UUID format', async () => {
      const result = await userService.getById('invalid-uuid');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid user ID format');
      }
    });
  });

  describe('getByEmail', () => {
    it('should return user when found by email', async () => {
      const createUserDto: CreateUserDto = {
        email: 'findbyemail@example.com',
        username: 'emailuser',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(createUserDto);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await userService.getByEmail(createUserDto.email);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe(createUserDto.email);
        expect(result.value.username).toBe(createUserDto.username);
      }
    });

    it('should return error when user not found by email', async () => {
      const result = await userService.getByEmail('nonexistent@example.com');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('User not found');
      }
    });

    it('should return error for invalid email format', async () => {
      const result = await userService.getByEmail('invalid-email');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Invalid email format');
      }
    });
  });

  describe('getByUsername', () => {
    it('should return user when found by username', async () => {
      const createUserDto: CreateUserDto = {
        email: 'findbyusername@example.com',
        username: 'uniqueusername',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(createUserDto);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await userService.getByUsername(createUserDto.username);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.email).toBe(createUserDto.email);
        expect(result.value.username).toBe(createUserDto.username);
      }
    });

    it('should return error when user not found by username', async () => {
      const result = await userService.getByUsername('nonexistentuser');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('User not found');
      }
    });
  });
});
