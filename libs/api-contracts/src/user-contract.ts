import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateUserRequestSchema, UserResponseSchema } from './user-schemas.js';

const c = initContract();

export const userContract = c.router(
  {
    createUser: {
      method: 'POST',
      path: '/users',
      responses: {
        201: UserResponseSchema,
        400: z.object({
          message: z.string(),
        }),
        409: z.union([
          z.object({
            message: z.string(),
            code: z.literal('EMAIL_ALREADY_EXISTS'),
          }),
          z.object({
            message: z.string(),
            code: z.literal('USERNAME_ALREADY_EXISTS'),
          }),
        ]),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
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
        400: z.object({
          message: z.string(),
          code: z.literal('INVALID_USER_ID'),
        }),
        404: z.object({
          message: z.string(),
          code: z.literal('USER_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'Get user by ID',
      strictStatusCodes: true,
    },
  },
  {
    strictStatusCodes: true,
  },
);
