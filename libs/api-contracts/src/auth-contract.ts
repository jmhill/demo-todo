import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { LoginRequestSchema, LoginResponseSchema } from './auth-schemas.js';
import { ErrorResponseSchema } from './common-schemas.js';

const c = initContract();

export const authContract = c.router(
  {
    login: {
      method: 'POST',
      path: '/auth/login',
      responses: {
        200: LoginResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      body: LoginRequestSchema,
      summary: 'Login with username/email and password',
      strictStatusCodes: true,
    },
    logout: {
      method: 'POST',
      path: '/auth/logout',
      responses: {
        204: z.void(),
        401: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      body: z.void(),
      summary: 'Logout and invalidate token',
      strictStatusCodes: true,
    },
  },
  {
    strictStatusCodes: true,
  },
);
