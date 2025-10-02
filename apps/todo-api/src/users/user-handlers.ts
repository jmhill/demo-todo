import type { Request, Response } from 'express';
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

// Helper: Parse and validate request body into CreateUserCommand
const parseCreateCommand = (
  body: unknown,
): Result<CreateUserCommand, UserError> => {
  const result = CreateUserCommandSchema.safeParse(body);
  return result.success ? ok(result.data) : err(validationError(result.error));
};

// Handler factory for POST /users - Create a new user
export const createUserHandler = (userService: UserService) => {
  return async (req: Request, res: Response) => {
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
  };
};

// Handler factory for GET /users/:id - Get user by ID
export const getUserByIdHandler = (userService: UserService) => {
  return async (req: Request, res: Response) => {
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
  };
};
