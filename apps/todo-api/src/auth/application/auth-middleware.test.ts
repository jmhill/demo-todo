import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { createAuthMiddleware } from './auth-middleware.js';
import { createAuthService } from '../domain/auth-service.js';
import { createInMemoryTokenStore } from '../domain/token-store.js';
import { createUserService } from '../../users/domain/user-service.js';
import { createInMemoryUserStore } from '../../users/infrastructure/user-store-in-mem.js';
import { createMockPasswordHasher } from '../../users/infrastructure/password-hasher-fake.js';
import {
  createUuidIdGenerator,
  createSystemClock,
} from '@demo-todo/infrastructure';

describe('createAuthMiddleware', () => {
  let app: Express;
  let authService: ReturnType<typeof createAuthService>;
  let userService: ReturnType<typeof createUserService>;

  const testConfig = {
    jwtSecret: 'test-secret-key-for-testing-only',
    jwtExpiresIn: '1h',
  };

  beforeEach(() => {
    // Create real services with in-memory stores
    const userStore = createInMemoryUserStore();
    userService = createUserService(
      userStore,
      createMockPasswordHasher(),
      createUuidIdGenerator(),
      createSystemClock(),
    );

    const tokenStore = createInMemoryTokenStore();
    authService = createAuthService({
      userService,
      tokenStore,
      jwtSecret: testConfig.jwtSecret,
      jwtExpiresIn: testConfig.jwtExpiresIn,
    });
  });

  it('should allow access with valid token and attach user to request', async () => {
    // Create a user and login to get a valid token
    await userService.createUser({
      email: 'test@example.com',
      username: 'testuser',
      password: 'SecurePass123!',
    });

    const loginResult = await authService.login('testuser', 'SecurePass123!');
    expect(loginResult.isOk()).toBe(true);
    if (!loginResult.isOk()) return;

    const { token, user } = loginResult.value;

    // Create app with middleware
    app = express();
    app.use(express.json());
    app.get(
      '/test',
      createAuthMiddleware(authService, userService),
      (req: Request, res: Response) => {
        res.json({
          success: true,
          user: req.auth?.user,
          hasToken: !!req.auth?.token,
        });
      },
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.user.email).toBe(user.email);
    expect(response.body.user.username).toBe(user.username);
    expect(response.body.user.createdAt).toBeDefined();
    expect(response.body.user.updatedAt).toBeDefined();
    expect(response.body.hasToken).toBe(true);
  });

  it('should return 401 when authorization header is missing', async () => {
    app = express();
    app.use(express.json());
    app.get(
      '/test',
      createAuthMiddleware(authService, userService),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app).get('/test').expect(401);

    expect(response.body).toEqual({
      message: 'Missing authorization token',
      code: 'INVALID_TOKEN',
    });
  });

  it('should return 401 when token format is invalid', async () => {
    app = express();
    app.use(express.json());
    app.get(
      '/test',
      createAuthMiddleware(authService, userService),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'InvalidFormat token')
      .expect(401);

    expect(response.body).toEqual({
      message: 'Missing authorization token',
      code: 'INVALID_TOKEN',
    });
  });

  it('should return 401 when token is missing from Bearer format', async () => {
    app = express();
    app.use(express.json());
    app.get(
      '/test',
      createAuthMiddleware(authService, userService),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer ')
      .expect(401);

    expect(response.body).toEqual({
      message: 'Missing authorization token',
      code: 'INVALID_TOKEN',
    });
  });

  it('should return 401 when token verification fails', async () => {
    app = express();
    app.use(express.json());
    app.get(
      '/test',
      createAuthMiddleware(authService, userService),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer invalid-token-that-will-fail-verification')
      .expect(401);

    expect(response.body).toEqual({
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  });

  it('should return 401 when using an invalidated token', async () => {
    // Create a user and login to get a valid token
    await userService.createUser({
      email: 'invalidated@example.com',
      username: 'invalidateduser',
      password: 'SecurePass123!',
    });

    const loginResult = await authService.login(
      'invalidateduser',
      'SecurePass123!',
    );
    expect(loginResult.isOk()).toBe(true);
    if (!loginResult.isOk()) return;

    const { token } = loginResult.value;

    // Logout (invalidate the token)
    await authService.logout(token);

    app = express();
    app.use(express.json());
    app.get(
      '/test',
      createAuthMiddleware(authService, userService),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(response.body).toEqual({
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  });
});
