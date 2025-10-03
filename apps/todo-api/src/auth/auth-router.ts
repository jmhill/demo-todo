import { initServer } from '@ts-rest/express';
import { authContract } from '@demo-todo/api-contracts';
import type { AuthService } from './auth-service.js';

const s = initServer();

// Factory to create auth router with dependencies
export const createAuthRouter = (authService: AuthService) => {
  return s.router(authContract, {
    login: async ({ body }) => {
      const result = await authService.login(
        body.usernameOrEmail,
        body.password,
      );

      return result.match(
        (data) => ({
          status: 200,
          body: data,
        }),
        (error) => {
          // Map auth errors to HTTP status codes
          if (error.code === 'INVALID_CREDENTIALS') {
            return {
              status: 401,
              body: { message: error.message },
            };
          }
          return {
            status: 500,
            body: { message: error.message },
          };
        },
      );
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

      return result.match(
        () => ({
          status: 204,
          body: undefined,
        }),
        (error) => ({
          status: 500,
          body: { message: error.message },
        }),
      );
    },
  });
};
