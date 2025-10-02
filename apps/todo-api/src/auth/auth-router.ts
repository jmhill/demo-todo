import express, { Router, type Request, type Response } from 'express';
import { ok, err, type Result } from 'neverthrow';
import type { AuthService } from './auth-service.js';
import {
  LoginRequestSchema,
  type LoginRequest,
  LoginResponseSchema,
} from './auth-schemas.js';
import {
  type AuthError,
  toErrorResponse,
  missingToken,
} from './auth-errors.js';

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

// Helper: Extract Bearer token from Authorization header
const extractBearerToken = (
  authHeader: string | undefined,
): Result<string, AuthError> => {
  if (!authHeader) {
    return err(missingToken());
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return err(
      missingToken('Authorization header must be in format: Bearer <token>'),
    );
  }

  const token = parts[1];
  if (!token) {
    return err(missingToken('Token is missing'));
  }

  return ok(token);
};

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  // Parse JSON body for POST requests
  router.use(express.json());

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

  // POST /auth/logout - Logout and invalidate token
  router.post('/logout', async (req: Request, res: Response) => {
    await extractBearerToken(req.headers.authorization)
      .asyncAndThen((token) => authService.logout(token))
      .match(
        () => res.status(204).send(),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  });

  return router;
}
