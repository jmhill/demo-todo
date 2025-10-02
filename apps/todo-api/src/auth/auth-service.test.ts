import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthService } from './auth-service.js';
import { createInMemoryTokenStore } from './token-store.js';
import { createUserService } from '../users/user-service.js';
import { createInMemoryUserStore } from '../users/user-store.js';
import type { CreateUserCommand } from '../users/user-schemas.js';

describe('AuthService', () => {
  let authService: ReturnType<typeof createAuthService>;
  let userService: ReturnType<typeof createUserService>;
  let tokenStore: ReturnType<typeof createInMemoryTokenStore>;

  const testConfig = {
    jwtSecret: 'test-secret-key-for-testing-only',
    jwtExpiresIn: '1h',
  };

  beforeEach(() => {
    const userStore = createInMemoryUserStore();
    userService = createUserService(userStore);
    tokenStore = createInMemoryTokenStore();
    authService = createAuthService({
      userService,
      tokenStore,
      jwtSecret: testConfig.jwtSecret,
      jwtExpiresIn: testConfig.jwtExpiresIn,
    });
  });

  describe('login', () => {
    it('should return token and user for valid credentials', async () => {
      const command: CreateUserCommand = {
        email: 'login@example.com',
        username: 'loginuser',
        password: 'SecurePass123!',
      };

      await userService.createUser(command);

      const result = await authService.login('loginuser', 'SecurePass123!');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.token).toBeDefined();
        expect(typeof result.value.token).toBe('string');
        expect(result.value.user.username).toBe(command.username);
        expect(result.value.user.email).toBe(command.email);
      }
    });

    it('should allow login with email', async () => {
      const command: CreateUserCommand = {
        email: 'emaillogin@example.com',
        username: 'emailuser',
        password: 'SecurePass123!',
      };

      await userService.createUser(command);

      const result = await authService.login(
        'emaillogin@example.com',
        'SecurePass123!',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.email).toBe(command.email);
      }
    });

    it('should reject login with invalid credentials', async () => {
      const command: CreateUserCommand = {
        email: 'wrongpass@example.com',
        username: 'wrongpassuser',
        password: 'CorrectPassword123!',
      };

      await userService.createUser(command);

      const result = await authService.login(
        'wrongpassuser',
        'WrongPassword123!',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('should reject login for non-existent user', async () => {
      const result = await authService.login('nonexistent', 'SomePass123!');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_CREDENTIALS');
      }
    });
  });

  describe('logout', () => {
    it('should invalidate a valid token', async () => {
      const command: CreateUserCommand = {
        email: 'logout@example.com',
        username: 'logoutuser',
        password: 'SecurePass123!',
      };

      await userService.createUser(command);
      const loginResult = await authService.login(
        'logoutuser',
        'SecurePass123!',
      );
      expect(loginResult.isOk()).toBe(true);
      if (!loginResult.isOk()) return;

      const token = loginResult.value.token;
      const result = await authService.logout(token);

      expect(result.isOk()).toBe(true);
    });

    it('should return error for invalid token format', async () => {
      const result = await authService.logout('not-a-valid-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TOKEN');
      }
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token and return user ID', async () => {
      const command: CreateUserCommand = {
        email: 'verify@example.com',
        username: 'verifyuser',
        password: 'SecurePass123!',
      };

      const createResult = await userService.createUser(command);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const loginResult = await authService.login(
        'verifyuser',
        'SecurePass123!',
      );
      expect(loginResult.isOk()).toBe(true);
      if (!loginResult.isOk()) return;

      const token = loginResult.value.token;
      const result = await authService.verifyToken(token);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe(createResult.value.id);
      }
    });

    it('should reject expired or invalid tokens', async () => {
      const result = await authService.verifyToken('invalid.token.here');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TOKEN');
      }
    });

    it('should reject invalidated tokens', async () => {
      const command: CreateUserCommand = {
        email: 'invalidated@example.com',
        username: 'invalidateduser',
        password: 'SecurePass123!',
      };

      await userService.createUser(command);
      const loginResult = await authService.login(
        'invalidateduser',
        'SecurePass123!',
      );
      expect(loginResult.isOk()).toBe(true);
      if (!loginResult.isOk()) return;

      const token = loginResult.value.token;

      await authService.logout(token);

      const result = await authService.verifyToken(token);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TOKEN');
      }
    });
  });
});
