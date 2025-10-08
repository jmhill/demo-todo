import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIncrementingClock,
  createUuidIdGenerator,
} from '@demo-todo/infrastructure';
import { createTodoService } from './todo-service.js';
import { createInMemoryTodoStore } from '../infrastructure/todo-store-in-mem.js';
import type { CreateTodoCommand } from './todo-schemas.js';

describe('TodoService', () => {
  let todoService: ReturnType<typeof createTodoService>;
  let todoStore: ReturnType<typeof createInMemoryTodoStore>;

  beforeEach(() => {
    todoStore = createInMemoryTodoStore();
    todoService = createTodoService(
      todoStore,
      createUuidIdGenerator(),
      createIncrementingClock(),
    );
  });

  describe('createTodo', () => {
    it('should create a new todo with valid data', async () => {
      const command: CreateTodoCommand = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Buy groceries',
        description: 'Milk, eggs, bread',
      };

      const result = await todoService.createTodo(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe(command.userId);
        expect(result.value.title).toBe(command.title);
        expect(result.value.description).toBe(command.description);
        expect(result.value.completed).toBe(false);
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.completedAt).toBeUndefined();
      }
    });

    it('should create a new todo without description', async () => {
      const command: CreateTodoCommand = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Complete project',
      };

      const result = await todoService.createTodo(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.userId).toBe(command.userId);
        expect(result.value.title).toBe(command.title);
        expect(result.value.description).toBeUndefined();
        expect(result.value.completed).toBe(false);
      }
    });
  });

  describe('listTodos', () => {
    it('should return all todos for a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      // Create multiple todos for the user
      await todoService.createTodo({
        userId,
        title: 'First todo',
        description: 'Description 1',
      });
      await todoService.createTodo({ userId, title: 'Second todo' });
      await todoService.createTodo({
        userId,
        title: 'Third todo',
        description: 'Description 3',
      });

      const result = await todoService.listTodos(userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0]?.title).toBe('First todo');
        expect(result.value[1]?.title).toBe('Second todo');
        expect(result.value[2]?.title).toBe('Third todo');
      }
    });

    it('should return empty array when user has no todos', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await todoService.listTodos(userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should only return todos for the specified user', async () => {
      const user1Id = '550e8400-e29b-41d4-a716-446655440000';
      const user2Id = '550e8400-e29b-41d4-a716-446655440001';

      // Create todos for different users
      await todoService.createTodo({ userId: user1Id, title: 'User 1 Todo 1' });
      await todoService.createTodo({ userId: user2Id, title: 'User 2 Todo 1' });
      await todoService.createTodo({ userId: user1Id, title: 'User 1 Todo 2' });

      const result = await todoService.listTodos(user1Id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.title).toBe('User 1 Todo 1');
        expect(result.value[1]?.title).toBe('User 1 Todo 2');
      }
    });
  });

  describe('getTodoById', () => {
    it('should return todo when found and user is authorized', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const command: CreateTodoCommand = {
        userId,
        title: 'Test todo',
        description: 'Test description',
      };

      const createResult = await todoService.createTodo(command);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await todoService.getTodoById({
        todoId: createResult.value.id,
        userId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(createResult.value.id);
        expect(result.value.title).toBe(command.title);
        expect(result.value.description).toBe(command.description);
      }
    });

    it('should return error when todo not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';

      const result = await todoService.getTodoById({
        todoId: nonExistentId,
        userId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TODO_NOT_FOUND');
      }
    });

    it('should return error when todo ID format is invalid', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const invalidId = 'not-a-uuid';

      const result = await todoService.getTodoById({
        todoId: invalidId,
        userId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TODO_ID');
      }
    });

    it('should return error when user is not authorized to access todo', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const otherUserId = '550e8400-e29b-41d4-a716-446655440001';

      const createResult = await todoService.createTodo({
        userId: ownerId,
        title: 'Owner todo',
      });
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await todoService.getTodoById({
        todoId: createResult.value.id,
        userId: otherUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED_ACCESS');
      }
    });
  });

  describe('completeTodo', () => {
    it('should mark todo as completed', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const createResult = await todoService.createTodo({
        userId,
        title: 'Todo to complete',
      });
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await todoService.completeTodo({
        todoId: createResult.value.id,
        userId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.completed).toBe(true);
        expect(result.value.completedAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should return error when todo not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';

      const result = await todoService.completeTodo({
        todoId: nonExistentId,
        userId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TODO_NOT_FOUND');
      }
    });

    it('should return error when todo ID format is invalid', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const invalidId = 'not-a-uuid';

      const result = await todoService.completeTodo({
        todoId: invalidId,
        userId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TODO_ID');
      }
    });

    it('should return error when user is not authorized', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const otherUserId = '550e8400-e29b-41d4-a716-446655440001';

      const createResult = await todoService.createTodo({
        userId: ownerId,
        title: 'Owner todo',
      });
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await todoService.completeTodo({
        todoId: createResult.value.id,
        userId: otherUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('UNAUTHORIZED_ACCESS');
      }
    });

    it('should return error when todo is already completed', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      const createResult = await todoService.createTodo({
        userId,
        title: 'Todo to complete twice',
      });
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      // Complete the todo first time
      const firstComplete = await todoService.completeTodo({
        todoId: createResult.value.id,
        userId,
      });
      expect(firstComplete.isOk()).toBe(true);

      // Try to complete again
      const result = await todoService.completeTodo({
        todoId: createResult.value.id,
        userId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TODO_ALREADY_COMPLETED');
      }
    });
  });
});
