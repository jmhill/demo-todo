import {
  LoginResponseSchema,
  type LoginResponse,
} from '@demo-todo/api-contracts';
import {
  TodoResponseSchema,
  type TodoResponse,
} from '@demo-todo/api-contracts';
import {
  ErrorResponseSchema,
  type ErrorResponse,
} from '@demo-todo/api-contracts';

/**
 * Creates valid test user - VALIDATED by schema
 * If schema changes, this BREAKS at runtime
 */
export const createTestUser = (overrides?: Partial<LoginResponse['user']>) => {
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'alice@example.com',
    username: 'alice',
    ...overrides,
  };

  // ✅ This will THROW if user doesn't match schema
  LoginResponseSchema.shape.user.parse(user);
  return user;
};

/**
 * Creates valid login response - VALIDATED by schema
 * If LoginResponseSchema changes, this BREAKS
 */
export const createTestLoginResponse = (
  userOverrides?: Partial<LoginResponse['user']>,
): LoginResponse => {
  const response = {
    token: 'mock-jwt-token-12345',
    user: createTestUser(userOverrides),
  };

  // ✅ Runtime validation ensures contract compliance
  return LoginResponseSchema.parse(response);
};

/**
 * Creates valid todo - VALIDATED by schema
 */
export const createTestTodo = (
  overrides?: Partial<TodoResponse>,
): TodoResponse => {
  const todo = {
    id: '650e8400-e29b-41d4-a716-446655440001',
    organizationId: '550e8400-e29b-41d4-a716-446655440000',
    createdBy: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Buy groceries',
    description: 'Milk, eggs, bread',
    completed: false,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
    ...overrides,
  };

  // ✅ This will THROW if todo doesn't match TodoResponseSchema
  return TodoResponseSchema.parse(todo);
};

/**
 * Generates a valid UUID v4
 */
export const generateTestUuid = (seed: number = 1): string => {
  const hex = seed.toString(16).padStart(12, '0');
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(1, 4)}-${hex.slice(0, 12)}`;
};

/**
 * Creates valid error response - VALIDATED by schema
 */
export const createTestErrorResponse = (
  message: string,
  code?: string,
): ErrorResponse => {
  const error = code ? { message, code } : { message };

  // ✅ This will THROW if error doesn't match ErrorResponseSchema
  return ErrorResponseSchema.parse(error);
};
