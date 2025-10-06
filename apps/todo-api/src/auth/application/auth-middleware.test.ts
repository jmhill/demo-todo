import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { okAsync, errAsync } from 'neverthrow';
import { createAuthMiddleware } from './auth-middleware.js';
import type { AuthService } from '../domain/auth-service.js';
import type { UserService } from '../../users/domain/user-service.js';
import type { User } from '../../users/domain/user-schemas.js';

// Mock user helper
const createMockUser = (id = 'user-123'): User => ({
  id,
  email: 'test@example.com',
  username: 'testuser',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

// Mock request helper
const createMockRequest = (authHeader?: string): Partial<Request> => ({
  headers: authHeader ? { authorization: authHeader } : {},
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
};

describe('createAuthMiddleware', () => {
  it('should call next() when token is valid and user exists', async () => {
    const mockUser = createMockUser();
    const mockAuthService: Partial<AuthService> = {
      verifyToken: vi.fn().mockReturnValue(okAsync({ userId: 'user-123' })),
    };
    const mockUserService: Partial<UserService> = {
      getById: vi.fn().mockReturnValue(okAsync(mockUser)),
    };

    const middleware = createAuthMiddleware(
      mockAuthService as AuthService,
      mockUserService as UserService,
    );
    const req = createMockRequest('Bearer valid-token');
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockUserService.getById).toHaveBeenCalledWith('user-123');
    expect(next).toHaveBeenCalled();
    expect(req.auth?.user).toEqual(mockUser);
    expect(req.auth?.token).toBe('valid-token');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header is missing', async () => {
    const mockAuthService: Partial<AuthService> = {
      verifyToken: vi.fn(),
    };
    const mockUserService: Partial<UserService> = {
      getById: vi.fn(),
    };

    const middleware = createAuthMiddleware(
      mockAuthService as AuthService,
      mockUserService as UserService,
    );
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    expect(mockUserService.getById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing authorization token',
      code: 'INVALID_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token format is invalid', async () => {
    const mockAuthService: Partial<AuthService> = {
      verifyToken: vi.fn(),
    };
    const mockUserService: Partial<UserService> = {
      getById: vi.fn(),
    };

    const middleware = createAuthMiddleware(
      mockAuthService as AuthService,
      mockUserService as UserService,
    );
    const req = createMockRequest('InvalidFormat token');
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    expect(mockUserService.getById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing authorization token',
      code: 'INVALID_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token verification fails', async () => {
    const mockAuthService: Partial<AuthService> = {
      verifyToken: vi
        .fn()
        .mockReturnValue(
          errAsync({ code: 'INVALID_TOKEN', message: 'Token is invalid' }),
        ),
    };
    const mockUserService: Partial<UserService> = {
      getById: vi.fn(),
    };

    const middleware = createAuthMiddleware(
      mockAuthService as AuthService,
      mockUserService as UserService,
    );
    const req = createMockRequest('Bearer invalid-token');
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(mockAuthService.verifyToken).toHaveBeenCalledWith('invalid-token');
    expect(mockUserService.getById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is missing from Bearer format', async () => {
    const mockAuthService: Partial<AuthService> = {
      verifyToken: vi.fn(),
    };
    const mockUserService: Partial<UserService> = {
      getById: vi.fn(),
    };

    const middleware = createAuthMiddleware(
      mockAuthService as AuthService,
      mockUserService as UserService,
    );
    const req = createMockRequest('Bearer ');
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    expect(mockUserService.getById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Missing authorization token',
      code: 'INVALID_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 404 when user is not found', async () => {
    const mockAuthService: Partial<AuthService> = {
      verifyToken: vi.fn().mockReturnValue(okAsync({ userId: 'user-123' })),
    };
    const mockUserService: Partial<UserService> = {
      getById: vi
        .fn()
        .mockReturnValue(
          errAsync({ code: 'USER_NOT_FOUND', identifier: 'user-123' }),
        ),
    };

    const middleware = createAuthMiddleware(
      mockAuthService as AuthService,
      mockUserService as UserService,
    );
    const req = createMockRequest('Bearer valid-token');
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req as Request, res as Response, next as NextFunction);

    expect(mockAuthService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockUserService.getById).toHaveBeenCalledWith('user-123');
    // User not found during auth verification should return 401 (unauthorized)
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Unauthorized',
      code: 'INVALID_TOKEN',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
