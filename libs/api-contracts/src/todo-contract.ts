import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateTodoRequestSchema, TodoResponseSchema } from './todo-schemas.js';

const c = initContract();

export const todoContract = c.router(
  {
    createTodo: {
      method: 'POST',
      path: '/todos',
      responses: {
        201: TodoResponseSchema,
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      body: CreateTodoRequestSchema,
      summary: 'Create a new todo',
      strictStatusCodes: true,
    },
    listTodos: {
      method: 'GET',
      path: '/todos',
      responses: {
        200: z.array(TodoResponseSchema),
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'List all todos for authenticated user',
      strictStatusCodes: true,
    },
    getTodoById: {
      method: 'GET',
      path: '/todos/:id',
      responses: {
        200: TodoResponseSchema,
        400: z.object({
          message: z.string(),
          code: z.literal('INVALID_TODO_ID'),
        }),
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        403: z.object({
          message: z.string(),
          code: z.literal('UNAUTHORIZED_ACCESS'),
        }),
        404: z.object({
          message: z.string(),
          code: z.literal('TODO_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'Get todo by ID',
      strictStatusCodes: true,
    },
    completeTodo: {
      method: 'PATCH',
      path: '/todos/:id/complete',
      responses: {
        200: TodoResponseSchema,
        400: z.union([
          z.object({
            message: z.string(),
            code: z.literal('INVALID_TODO_ID'),
          }),
          z.object({
            message: z.string(),
            code: z.literal('TODO_ALREADY_COMPLETED'),
          }),
        ]),
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        403: z.object({
          message: z.string(),
          code: z.literal('UNAUTHORIZED_ACCESS'),
        }),
        404: z.object({
          message: z.string(),
          code: z.literal('TODO_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      body: z.void(),
      summary: 'Mark todo as complete',
      strictStatusCodes: true,
    },
  },
  {
    strictStatusCodes: true,
  },
);
