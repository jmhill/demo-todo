import { initServer } from '@ts-rest/express';
import { authContract } from '@demo-todo/api-contracts';
import type { AuthService } from '../domain/auth-service.js';

const s = initServer();

// Factory to create auth router with dependencies
export const createAuthRouter = (authService: AuthService) => {
  return s.router(authContract, {
    login: async ({ body }) => {
      const result = await authService.login(
        body.usernameOrEmail,
        body.password,
      );

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'INVALID_CREDENTIALS':
            return {
              status: 401,
              body: { message: error.message },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: { message: 'Internal server error' },
            };
        }
      }

      return {
        status: 200,
        body: result.value,
      };
    },

    logout: async ({ req }) => {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          status: 401,
          body: { message: 'Unauthorized' },
        };
      }

      const token = authHeader.substring(7);
      const result = await authService.logout(token);

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'INVALID_TOKEN':
            return {
              status: 401,
              body: { message: 'Invalid token' },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: { message: 'Internal server error' },
            };
        }
      }

      return {
        status: 204,
        body: undefined,
      };
    },
  });
};
