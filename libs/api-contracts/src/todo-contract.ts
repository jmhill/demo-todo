import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateTodoRequestSchema, TodoResponseSchema } from './todo-schemas.js';

const c = initContract();

const ErrorResponseSchema = z.object({
  message: z.string(),
});

export const todoContract = c.router({
  createTodo: {
    method: 'POST',
    path: '/todos',
    responses: {
      201: TodoResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    body: CreateTodoRequestSchema,
    summary: 'Create a new todo',
  },
  listTodos: {
    method: 'GET',
    path: '/todos',
    responses: {
      200: z.array(TodoResponseSchema),
      401: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'List all todos for authenticated user',
  },
  getTodoById: {
    method: 'GET',
    path: '/todos/:id',
    responses: {
      200: TodoResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    summary: 'Get todo by ID',
  },
  completeTodo: {
    method: 'PATCH',
    path: '/todos/:id/complete',
    responses: {
      200: TodoResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema,
      500: ErrorResponseSchema,
    },
    body: z.void(),
    summary: 'Mark todo as complete',
  },
});
