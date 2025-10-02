import express, { Router, type Request, type Response } from 'express';
import { ok, err, type Result } from 'neverthrow';
import type { UserService } from './user-service.js';
import {
  CreateUserCommandSchema,
  type CreateUserCommand,
  UserResponseDtoSchema,
} from './user-schemas.js';
import {
  type UserError,
  toErrorResponse,
  validationError,
} from './user-errors.js';
import type { AuthService } from '../auth/auth-service.js';
import { createAuthMiddleware } from '../auth/auth-middleware.js';

// Helper: Parse and validate request body into CreateUserCommand
const parseCreateCommand = (
  body: unknown,
): Result<CreateUserCommand, UserError> => {
  const result = CreateUserCommandSchema.safeParse(body);
  return result.success ? ok(result.data) : err(validationError(result.error));
};

export function createUserRouter(
  userService: UserService,
  authService: AuthService,
): Router {
  const router = Router();

  // Parse JSON body for POST requests
  router.use(express.json());

  // Create auth middleware
  const requireAuth = createAuthMiddleware(authService, userService);

  // POST /users - Create a new user (protected)
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    await parseCreateCommand(req.body)
      .asyncAndThen((command) => userService.createUser(command))
      .map((user) => UserResponseDtoSchema.parse(user))
      .match(
        (dto) => res.status(201).json(dto),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  });

  // GET /users/:id - Get user by ID (protected)
  router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'User ID parameter is required' });
      return;
    }

    await userService
      .getById(id)
      .map((user) => UserResponseDtoSchema.parse(user))
      .match(
        (dto) => res.json(dto),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  });

  return router;
}
