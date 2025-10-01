import express, { Router, type Request, type Response } from 'express';
import { ok, err, type Result } from 'neverthrow';
import type { UserService } from './user-service.js';
import {
  CreateUserCommandSchema,
  type CreateUserCommand,
} from './user-schemas.js';
import {
  type UserError,
  toErrorResponse,
  validationError,
} from './user-errors.js';

// Helper: Parse and validate request body into CreateUserCommand
const parseCreateCommand = (
  body: unknown,
): Result<CreateUserCommand, UserError> => {
  const result = CreateUserCommandSchema.safeParse(body);
  return result.success ? ok(result.data) : err(validationError(result.error));
};

export function createUserRouter(userService: UserService): Router {
  const router = Router();

  // Parse JSON body for POST requests
  router.use(express.json());

  // POST /users - Create a new user
  router.post('/', async (req: Request, res: Response) => {
    await parseCreateCommand(req.body)
      .asyncAndThen((command) => userService.createUser(command))
      .match(
        (user) => res.status(201).json(user),
        (error) => {
          const errorResponse = toErrorResponse(error);
          res.status(errorResponse.statusCode).json(errorResponse.body);
        },
      );
  });

  // GET /users/:id - Get user by ID
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'User ID parameter is required' });
      return;
    }

    await userService.getById(id).match(
      (user) => res.json(user),
      (error) => {
        const errorResponse = toErrorResponse(error);
        res.status(errorResponse.statusCode).json(errorResponse.body);
      },
    );
  });

  return router;
}
