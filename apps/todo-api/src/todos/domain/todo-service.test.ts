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
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Buy groceries',
        description: 'Milk, eggs, bread',
      };

      const result = await todoService.createTodo(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.organizationId).toBe(command.organizationId);
        expect(result.value.createdBy).toBe(command.createdBy);
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
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Complete project',
      };

      const result = await todoService.createTodo(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.organizationId).toBe(command.organizationId);
        expect(result.value.createdBy).toBe(command.createdBy);
        expect(result.value.title).toBe(command.title);
        expect(result.value.description).toBeUndefined();
        expect(result.value.completed).toBe(false);
      }
    });
  });

  describe('listTodos', () => {
    it('should return all todos for an organization', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';

      // Create multiple todos for the organization
      await todoService.createTodo({
        organizationId,
        createdBy,
        title: 'First todo',
        description: 'Description 1',
      });
      await todoService.createTodo({
        organizationId,
        createdBy,
        title: 'Second todo',
      });
      await todoService.createTodo({
        organizationId,
        createdBy,
        title: 'Third todo',
        description: 'Description 3',
      });

      const result = await todoService.listTodos(organizationId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(3);
        expect(result.value[0]?.title).toBe('First todo');
        expect(result.value[1]?.title).toBe('Second todo');
        expect(result.value[2]?.title).toBe('Third todo');
      }
    });

    it('should return empty array when organization has no todos', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';

      const result = await todoService.listTodos(organizationId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should only return todos for the specified organization', async () => {
      const org1Id = '550e8400-e29b-41d4-a716-446655440000';
      const org2Id = '550e8400-e29b-41d4-a716-446655440001';
      const createdBy = '550e8400-e29b-41d4-a716-446655440002';

      // Create todos for different organizations
      await todoService.createTodo({
        organizationId: org1Id,
        createdBy,
        title: 'Org 1 Todo 1',
      });
      await todoService.createTodo({
        organizationId: org2Id,
        createdBy,
        title: 'Org 2 Todo 1',
      });
      await todoService.createTodo({
        organizationId: org1Id,
        createdBy,
        title: 'Org 1 Todo 2',
      });

      const result = await todoService.listTodos(org1Id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.title).toBe('Org 1 Todo 1');
        expect(result.value[1]?.title).toBe('Org 1 Todo 2');
      }
    });
  });

  describe('getTodoById', () => {
    it('should return todo when found', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';
      const command: CreateTodoCommand = {
        organizationId,
        createdBy,
        title: 'Test todo',
        description: 'Test description',
      };

      const createResult = await todoService.createTodo(command);
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await todoService.getTodoById(createResult.value.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(createResult.value.id);
        expect(result.value.title).toBe(command.title);
        expect(result.value.description).toBe(command.description);
      }
    });

    it('should return error when todo not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';

      const result = await todoService.getTodoById(nonExistentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TODO_NOT_FOUND');
      }
    });

    it('should return error when todo ID format is invalid', async () => {
      const invalidId = 'not-a-uuid';

      const result = await todoService.getTodoById(invalidId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TODO_ID');
      }
    });
  });

  describe('completeTodo', () => {
    it('should mark todo as completed', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';

      const createResult = await todoService.createTodo({
        organizationId,
        createdBy,
        title: 'Todo to complete',
      });
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      const result = await todoService.completeTodo(createResult.value.id);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.completed).toBe(true);
        expect(result.value.completedAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should return error when todo not found', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440099';

      const result = await todoService.completeTodo(nonExistentId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TODO_NOT_FOUND');
      }
    });

    it('should return error when todo ID format is invalid', async () => {
      const invalidId = 'not-a-uuid';

      const result = await todoService.completeTodo(invalidId);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('INVALID_TODO_ID');
      }
    });

    it('should return error when todo is already completed', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const createdBy = '550e8400-e29b-41d4-a716-446655440001';

      const createResult = await todoService.createTodo({
        organizationId,
        createdBy,
        title: 'Todo to complete twice',
      });
      expect(createResult.isOk()).toBe(true);
      if (!createResult.isOk()) return;

      // Complete the todo first time
      const firstComplete = await todoService.completeTodo(
        createResult.value.id,
      );
      expect(firstComplete.isOk()).toBe(true);

      // Try to complete again
      const result = await todoService.completeTodo(createResult.value.id);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('TODO_ALREADY_COMPLETED');
      }
    });
  });
});
