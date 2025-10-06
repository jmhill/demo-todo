import { initServer } from '@ts-rest/express';
import { userContract, type UserResponse } from '@demo-todo/api-contracts';
import type { UserService } from '../domain/user-service.js';
import { CreateUserCommandSchema } from '../domain/user-schemas.js';
import type { User } from '../domain/user-schemas.js';

const s = initServer();

// Helper to convert domain User to API response
const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  username: user.username,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

// Factory to create user router with dependencies
export const createUserRouter = (userService: UserService) => {
  return s.router(userContract, {
    createUser: async ({ body }) => {
      // Validate input
      const parsed = CreateUserCommandSchema.safeParse(body);
      if (!parsed.success) {
        return {
          status: 400,
          body: { message: `Validation failed: ${parsed.error.message}` },
        };
      }

      // Call service with validated data
      const result = await userService.createUser(parsed.data);

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'EMAIL_ALREADY_EXISTS':
            return {
              status: 409,
              body: {
                message: 'Unable to create account',
                code: 'EMAIL_ALREADY_EXISTS',
              },
            };
          case 'USERNAME_ALREADY_EXISTS':
            return {
              status: 409,
              body: {
                message: 'Username already taken',
                code: 'USERNAME_ALREADY_EXISTS',
              },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 201,
        body: toUserResponse(result.value),
      };
    },

    getUserById: async ({ params }) => {
      const result = await userService.getById(params.id);

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'INVALID_USER_ID':
            return {
              status: 400,
              body: {
                message: 'Invalid user ID format',
                code: 'INVALID_USER_ID',
              },
            };
          case 'USER_NOT_FOUND':
            return {
              status: 404,
              body: { message: 'User not found', code: 'USER_NOT_FOUND' },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 200,
        body: toUserResponse(result.value),
      };
    },
  });
};
