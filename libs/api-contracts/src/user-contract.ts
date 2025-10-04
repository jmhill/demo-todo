import { initContract } from '@ts-rest/core';
import { CreateUserRequestSchema, UserResponseSchema } from './user-schemas.js';
import { ErrorResponseSchema } from './common-schemas.js';

const c = initContract();

export const userContract = c.router(
  {
    createUser: {
      method: 'POST',
      path: '/users',
      responses: {
        201: UserResponseSchema,
        400: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      body: CreateUserRequestSchema,
      summary: 'Create a new user',
      strictStatusCodes: true,
    },
    getUserById: {
      method: 'GET',
      path: '/users/:id',
      responses: {
        200: UserResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      summary: 'Get user by ID',
      strictStatusCodes: true,
    },
  },
  {
    strictStatusCodes: true,
  },
);
