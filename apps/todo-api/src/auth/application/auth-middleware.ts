import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from '../domain/auth-service.js';
import type { VerifyTokenError } from '../domain/auth-errors.js';
import type { UserService } from '../../users/domain/user-service.js';
import type { User } from '../../users/domain/user-schemas.js';
import type { GetUserByIdError } from '../../users/domain/user-errors.js';

// Extend Express Request type to include auth context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        user: User;
        token: string;
      };
    }
  }
}

// Helper to map errors to HTTP responses (middleware-local)
const errorToHttpResponse = (error: VerifyTokenError | GetUserByIdError) => {
  // Token errors
  if (error.code === 'INVALID_TOKEN') {
    return {
      statusCode: 401,
      body: { message: 'Invalid token', code: 'INVALID_TOKEN' },
    };
  }

  // User errors
  if (error.code === 'USER_NOT_FOUND' || error.code === 'INVALID_USER_ID') {
    return {
      statusCode: 401,
      body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
    };
  }

  // Unexpected errors
  return {
    statusCode: 500,
    body: { message: 'Internal server error', code: 'UNEXPECTED_ERROR' },
  };
};

// Helper: Extract Bearer token from Authorization header
const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];
  if (!token) {
    return null;
  }

  return token;
};

export function createAuthMiddleware(
  authService: AuthService,
  userService: UserService,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        message: 'Missing authorization token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    await authService
      .verifyToken(token)
      .andThen((result) => userService.getById(result.userId))
      .match(
        (user) => {
          req.auth = { user, token };
          next();
        },
        (error) => {
          const errorResponse = errorToHttpResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
}
