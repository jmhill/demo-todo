import { describe, it, expect } from 'vitest';
import {
  LoginResponseSchema,
  TodoResponseSchema,
  ErrorResponseSchema,
} from '@demo-todo/api-contracts';
import {
  createTestLoginResponse,
  createTestTodo,
  createTestErrorResponse,
  createTestUser,
} from './fixtures/test-data';

/**
 * These tests validate that our test data factories produce
 * schema-compliant data that matches the API contracts.
 *
 * If any schema changes in @demo-todo/api-contracts, these tests
 * will fail, forcing us to update our test fixtures and MSW handlers.
 *
 * This is our defense against mock drift.
 */
describe('MSW Contract Compliance', () => {
  describe('Authentication Contracts', () => {
    it('test user matches LoginResponse user schema', () => {
      const user = createTestUser();

      // ✅ Should not throw
      expect(() => LoginResponseSchema.shape.user.parse(user)).not.toThrow();

      // Verify required fields present
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
    });

    it('test login response matches LoginResponseSchema', () => {
      const response = createTestLoginResponse();

      // ✅ Should not throw - validates entire response structure
      expect(() => LoginResponseSchema.parse(response)).not.toThrow();

      // Verify structure
      expect(response).toHaveProperty('token');
      expect(response).toHaveProperty('user');
      expect(response.user).toHaveProperty('id');
      expect(response.user).toHaveProperty('username');
      expect(response.user).toHaveProperty('email');
    });

    it('test login response with user overrides matches schema', () => {
      const response = createTestLoginResponse({
        username: 'custom-user',
        email: 'custom@example.com',
      });

      // ✅ Should not throw even with overrides
      expect(() => LoginResponseSchema.parse(response)).not.toThrow();

      // Verify overrides applied
      expect(response.user.username).toBe('custom-user');
      expect(response.user.email).toBe('custom@example.com');
    });
  });

  describe('Todo Contracts', () => {
    it('test todo matches TodoResponseSchema', () => {
      const todo = createTestTodo();

      // ✅ Should not throw
      expect(() => TodoResponseSchema.parse(todo)).not.toThrow();

      // Verify required fields
      expect(todo).toHaveProperty('id');
      expect(todo).toHaveProperty('userId');
      expect(todo).toHaveProperty('title');
      expect(todo).toHaveProperty('completed');
      expect(todo).toHaveProperty('createdAt');
      expect(todo).toHaveProperty('updatedAt');
    });

    it('test todo with overrides matches schema', () => {
      const todo = createTestTodo({
        title: 'Custom title',
        description: 'Custom description',
        completed: true,
        completedAt: '2025-01-15T12:00:00Z',
      });

      // ✅ Should not throw
      expect(() => TodoResponseSchema.parse(todo)).not.toThrow();

      // Verify overrides applied
      expect(todo.title).toBe('Custom title');
      expect(todo.description).toBe('Custom description');
      expect(todo.completed).toBe(true);
      expect(todo.completedAt).toBe('2025-01-15T12:00:00Z');
    });

    it('test todo without optional description matches schema', () => {
      const todo = createTestTodo({ description: undefined });

      // ✅ Should not throw - description is optional
      expect(() => TodoResponseSchema.parse(todo)).not.toThrow();

      // Verify description is undefined
      expect(todo.description).toBeUndefined();
    });
  });

  describe('Error Response Contracts', () => {
    it('test error response matches ErrorResponseSchema', () => {
      const error = createTestErrorResponse('Test error message');

      // ✅ Should not throw
      expect(() => ErrorResponseSchema.parse(error)).not.toThrow();

      // Verify structure
      expect(error).toHaveProperty('message');
      expect(error.message).toBe('Test error message');
    });

    it('test various error messages match schema', () => {
      const errors = [
        createTestErrorResponse('Invalid credentials'),
        createTestErrorResponse('Unauthorized'),
        createTestErrorResponse('Todo not found'),
        createTestErrorResponse('Todo already completed'),
      ];

      errors.forEach((error) => {
        expect(() => ErrorResponseSchema.parse(error)).not.toThrow();
        expect(error.message).toBeTruthy();
      });
    });
  });

  describe('Schema Evolution Safety', () => {
    it('should fail if required field is missing from test data', () => {
      // This test documents expected behavior when schema changes
      // If a new required field is added to LoginResponseSchema,
      // our factory will throw and this test will fail

      const manualData = {
        token: 'test-token',
        // Missing 'user' field intentionally
      };

      // ✅ Should throw because required field missing
      expect(() => LoginResponseSchema.parse(manualData)).toThrow();
    });

    it('should fail if field type is incorrect', () => {
      const manualData = {
        id: 'valid-uuid',
        userId: 'valid-uuid',
        title: 123, // ❌ Wrong type - should be string
        completed: false,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      };

      // ✅ Should throw because type is wrong
      expect(() => TodoResponseSchema.parse(manualData)).toThrow();
    });

    it('should validate UUID format for IDs', () => {
      const invalidTodo = {
        id: 'not-a-uuid', // ❌ Invalid UUID
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test',
        completed: false,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      };

      // ✅ Should throw because ID is not a valid UUID
      expect(() => TodoResponseSchema.parse(invalidTodo)).toThrow();
    });

    it('should validate email format in user schema', () => {
      const invalidUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'alice',
        email: 'not-an-email', // ❌ Invalid email format
      };

      // ✅ Should throw because email format is invalid
      expect(() => LoginResponseSchema.shape.user.parse(invalidUser)).toThrow();
    });
  });
});
