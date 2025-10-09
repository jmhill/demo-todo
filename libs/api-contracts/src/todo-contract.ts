import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateTodoRequestSchema, TodoResponseSchema } from './todo-schemas.js';

const c = initContract();

export const todoContract = c.router(
  {
    createTodo: {
      method: 'POST',
      path: '/orgs/:orgId/todos',
      responses: {
        201: TodoResponseSchema,
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        403: z.object({
          message: z.string(),
          code: z.literal('MISSING_PERMISSION'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      body: CreateTodoRequestSchema,
      summary: 'Create a new todo in organization',
      strictStatusCodes: true,
    },
    listTodos: {
      method: 'GET',
      path: '/orgs/:orgId/todos',
      responses: {
        200: z.array(TodoResponseSchema),
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        403: z.object({
          message: z.string(),
          code: z.literal('MISSING_PERMISSION'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'List all todos in organization',
      strictStatusCodes: true,
    },
    getTodoById: {
      method: 'GET',
      path: '/orgs/:orgId/todos/:id',
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
      path: '/orgs/:orgId/todos/:id/complete',
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
    deleteTodo: {
      method: 'DELETE',
      path: '/orgs/:orgId/todos/:id',
      responses: {
        204: z.void(),
        401: z.object({
          message: z.string(),
          code: z.literal('INVALID_TOKEN'),
        }),
        403: z.object({
          message: z.string(),
          code: z.literal('MISSING_PERMISSION'),
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
      summary: 'Delete todo',
      strictStatusCodes: true,
    },
  },
  {
    strictStatusCodes: true,
  },
);
