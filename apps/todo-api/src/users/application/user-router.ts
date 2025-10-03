import { initServer } from '@ts-rest/express';
import { userContract } from '@demo-todo/api-contracts';
import type { UserService } from '../domain/user-service.js';
import { CreateUserCommandSchema } from '../domain/user-schemas.js';

const s = initServer();

// Factory to create user router with dependencies
export const createUserRouter = (userService: UserService) => {
  return s.router(userContract, {
    createUser: async ({ body }) => {
      // Validate and transform request to domain command
      const commandResult = CreateUserCommandSchema.safeParse(body);

      if (!commandResult.success) {
        return {
          status: 400,
          body: {
            message: `Validation failed: ${commandResult.error.message}`,
          },
        };
      }

      const result = await userService.createUser(commandResult.data);

      return result.match(
        (user) => ({
          status: 201,
          body: {
            id: user.id,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        }),
        (error) => {
          // Map domain errors to HTTP status codes
          if (error.code === 'EMAIL_ALREADY_EXISTS') {
            return {
              status: 409,
              body: { message: 'Unable to create account' },
            };
          }
          if (error.code === 'USERNAME_ALREADY_EXISTS') {
            return {
              status: 409,
              body: { message: 'Username already taken' },
            };
          }
          if (error.code === 'VALIDATION_ERROR') {
            return {
              status: 400,
              body: { message: error.message },
            };
          }
          return {
            status: 500,
            body: { message: 'Internal server error' },
          };
        },
      );
    },

    getUserById: async ({ params }) => {
      const result = await userService.getById(params.id);

      return result.match(
        (user) => ({
          status: 200,
          body: {
            id: user.id,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
        }),
        (error) => {
          // Map domain errors to HTTP status codes
          if (error.code === 'USER_NOT_FOUND') {
            return {
              status: 404,
              body: { message: 'User not found' },
            };
          }
          if (error.code === 'INVALID_USER_ID') {
            return {
              status: 400,
              body: { message: 'Invalid user ID format' },
            };
          }
          return {
            status: 500,
            body: { message: 'Internal server error' },
          };
        },
      );
    },
  });
};
