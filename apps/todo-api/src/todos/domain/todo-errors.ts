import { z } from 'zod';

export type TodoError =
  | { code: 'VALIDATION_ERROR'; message: string; details?: unknown }
  | { code: 'TODO_NOT_FOUND'; identifier: string }
  | { code: 'INVALID_TODO_ID'; id: string }
  | { code: 'TODO_ALREADY_COMPLETED'; todoId: string }
  | { code: 'UNAUTHORIZED_ACCESS'; todoId: string; userId: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type ErrorResponse = {
  statusCode: number;
  body: { error: string };
};

export const toErrorResponse = (error: TodoError): ErrorResponse => {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return { statusCode: 400, body: { error: error.message } };
    case 'TODO_NOT_FOUND':
      return { statusCode: 404, body: { error: 'Todo not found' } };
    case 'INVALID_TODO_ID':
      return { statusCode: 400, body: { error: 'Invalid todo ID format' } };
    case 'TODO_ALREADY_COMPLETED':
      return { statusCode: 400, body: { error: 'Todo already completed' } };
    case 'UNAUTHORIZED_ACCESS':
      return { statusCode: 403, body: { error: 'Unauthorized access' } };
    case 'UNEXPECTED_ERROR':
      return { statusCode: 500, body: { error: 'Internal server error' } };
  }
};

// Error constructor helpers
export const validationError = (zodError: z.ZodError): TodoError => {
  const flattened = zodError.flatten();
  const fieldErrors = Object.entries(flattened.fieldErrors)
    .map(([field, errors]) => `${field}: ${(errors as string[])?.join(', ')}`)
    .join(', ');
  return {
    code: 'VALIDATION_ERROR',
    message: `Validation failed: ${fieldErrors}`,
    details: flattened.fieldErrors,
  };
};

export const todoNotFound = (identifier: string): TodoError => ({
  code: 'TODO_NOT_FOUND',
  identifier,
});

export const invalidTodoId = (id: string): TodoError => ({
  code: 'INVALID_TODO_ID',
  id,
});

export const todoAlreadyCompleted = (todoId: string): TodoError => ({
  code: 'TODO_ALREADY_COMPLETED',
  todoId,
});

export const unauthorizedAccess = (
  todoId: string,
  userId: string,
): TodoError => ({
  code: 'UNAUTHORIZED_ACCESS',
  todoId,
  userId,
});

export const unexpectedError = (
  message: string,
  cause?: unknown,
): TodoError => ({
  code: 'UNEXPECTED_ERROR',
  message,
  cause,
});
