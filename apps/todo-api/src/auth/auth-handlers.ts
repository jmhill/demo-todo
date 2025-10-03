import type { Request, Response } from 'express';
import { ok, err, type Result } from 'neverthrow';
import type { AuthService } from './auth-service.js';
import {
  LoginRequestSchema,
  type LoginRequest,
  LoginResponseSchema,
} from '@demo-todo/api-contracts';
import { type AuthError, toErrorResponse } from './auth-errors.js';

// Helper: Parse and validate request body into LoginRequest
const parseLoginRequest = (body: unknown): Result<LoginRequest, AuthError> => {
  const result = LoginRequestSchema.safeParse(body);
  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return err({
      code: 'UNEXPECTED_ERROR',
      message: `Validation failed: ${errorMessage}`,
    });
  }
  return ok(result.data);
};

// Handler factory for POST /auth/login - Login with username/email and password
export const loginHandler = (authService: AuthService) => {
  return async (req: Request, res: Response) => {
    await parseLoginRequest(req.body)
      .asyncAndThen((loginReq) =>
        authService.login(loginReq.usernameOrEmail, loginReq.password),
      )
      .map((result) => LoginResponseSchema.parse(result))
      .match(
        (dto) => res.status(200).json(dto),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  };
};

// Handler factory for POST /auth/logout - Logout and invalidate token
export const logoutHandler = (authService: AuthService) => {
  return async (req: Request, res: Response) => {
    // Token is already verified by middleware and available in req.auth
    const token = req.auth!.token; // Non-null assertion safe because middleware ensures it exists

    await authService.logout(token).match(
      () => res.status(204).send(),
      (error) => {
        const errorResponse = toErrorResponse(error);
        res.status(errorResponse.statusCode).json(errorResponse.body);
      },
    );
  };
};
