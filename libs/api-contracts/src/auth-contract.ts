import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { LoginRequestSchema, LoginResponseSchema } from './auth-schemas.js';

const c = initContract();

export const authContract = c.router(
  {
    login: {
      method: 'POST',
      path: '/auth/login',
      responses: {
        200: LoginResponseSchema,
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_CREDENTIALS'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
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
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
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
