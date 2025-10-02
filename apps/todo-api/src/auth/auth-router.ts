import express, { Router, type Request, type Response } from 'express';
import { ok, err, type Result } from 'neverthrow';
import type { AuthService } from './auth-service.js';
import {
  LoginRequestSchema,
  type LoginRequest,
  LoginResponseSchema,
} from './auth-schemas.js';
import { type AuthError, toErrorResponse } from './auth-errors.js';
import { createAuthMiddleware } from './auth-middleware.js';
import type { UserService } from '../users/user-service.js';

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

export function createAuthRouter(
  authService: AuthService,
  userService: UserService,
): Router {
  const router = Router();

  // Parse JSON body for POST requests
  router.use(express.json());

  // Create auth middleware
  const requireAuth = createAuthMiddleware(authService, userService);

  // POST /auth/login - Login with username/email and password
  router.post('/login', async (req: Request, res: Response) => {
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
  });

  // POST /auth/logout - Logout and invalidate token (protected)
  router.post('/logout', requireAuth, async (req: Request, res: Response) => {
    // Token is already verified by middleware and available in req.auth
    const token = req.auth!.token; // Non-null assertion safe because middleware ensures it exists

    await authService.logout(token).match(
      () => res.status(204).send(),
      (error) => {
        const errorResponse = toErrorResponse(error);
        res.status(errorResponse.statusCode).json(errorResponse.body);
      },
    );
  });

  return router;
}
