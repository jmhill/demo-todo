import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from './auth-service.js';
import {
  toErrorResponse as authErrorToResponse,
  type AuthError,
} from './auth-errors.js';
import type { UserService } from '../users/domain/user-service.js';
import type { User } from '../users/domain/user-schemas.js';
import {
  toErrorResponse as userErrorToResponse,
  type UserError,
} from '../users/domain/user-errors.js';

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

// Helper to convert either AuthError or UserError to ErrorResponse
const toErrorResponse = (error: AuthError | UserError) => {
  // Check if it's an AuthError by checking for AuthError-specific codes
  if (
    error.code === 'INVALID_TOKEN' ||
    error.code === 'TOKEN_EXPIRED' ||
    error.code === 'MISSING_TOKEN'
  ) {
    return authErrorToResponse(error as AuthError);
  }
  // Otherwise assume it's a UserError
  return userErrorToResponse(error as UserError);
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
      const errorResponse = toErrorResponse({
        code: 'MISSING_TOKEN',
        message: 'Missing authorization token',
      });
      res.status(errorResponse.statusCode).json(errorResponse.body);
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
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
}
