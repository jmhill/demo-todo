import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TodoStore } from '../domain/todo-service.js';
import type { Todo } from '../domain/todo-schemas.js';

/**
 * Shared contract tests for TodoStore implementations.
 *
 * These tests ensure all adapters (Sequelize, in-memory) behave identically
 * and implement the TodoStore interface contract correctly.
 *
 * Note: Some adapters may have foreign key constraints requiring users and
 * organizations to exist. The setupDependencies hook allows adapters to
 * create these dependencies before tests run.
 */
export function runTodoStoreContractTests(options: {
  createStore: () => TodoStore | Promise<TodoStore>;
  setupDependencies?: (data: {
    organizationId: string;
    organization2Id?: string;
    userId: string;
  }) => void | Promise<void>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}) {
  let todoStore: TodoStore;

  // Standard test data IDs
  const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440098';
  const TEST_ORG_2_ID = '550e8400-e29b-41d4-a716-446655440097';
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440099';

  beforeEach(async () => {
    if (options.beforeEach) await options.beforeEach();
    todoStore = await options.createStore();
    // Set up any dependencies (users, orgs) required by the adapter
    if (options.setupDependencies) {
      await options.setupDependencies({
        organizationId: TEST_ORG_ID,
        organization2Id: TEST_ORG_2_ID,
        userId: TEST_USER_ID,
      });
    }
  });

  afterEach(async () => {
    if (options.afterEach) await options.afterEach();
  });

  describe('TodoStore Contract', () => {
    describe('save', () => {
      it('should save a todo with all fields', async () => {
        const now = new Date();
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Test todo',
          description: 'Test description',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        const found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(todo.id);
        expect(found?.organizationId).toBe(todo.organizationId);
        expect(found?.createdBy).toBe(todo.createdBy);
        expect(found?.title).toBe(todo.title);
        expect(found?.description).toBe(todo.description);
        expect(found?.completed).toBe(false);
      });

      it('should save a todo without optional description', async () => {
        const now = new Date();
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440001',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Todo without description',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        const found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();
        expect(found?.description).toBeUndefined();
      });

      it('should save a completed todo with completedAt timestamp', async () => {
        const now = new Date();
        const completedAt = new Date(now.getTime() + 1000);
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440002',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Completed todo',
          completed: true,
          completedAt,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        const found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();
        expect(found?.completed).toBe(true);
        expect(found?.completedAt).toBeInstanceOf(Date);
      });
    });

    describe('findById', () => {
      it('should return todo when found', async () => {
        const now = new Date();
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440003',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Find by ID',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        const found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(todo.id);
        expect(found?.title).toBe('Find by ID');
        expect(found?.createdAt).toBeInstanceOf(Date);
        expect(found?.updatedAt).toBeInstanceOf(Date);
      });

      it('should return null when todo not found', async () => {
        const found = await todoStore.findById(
          '550e8400-e29b-41d4-a716-446655440099',
        );
        expect(found).toBeNull();
      });
    });

    describe('findByOrganizationId', () => {
      it('should return all todos for an organization', async () => {
        const now = new Date();

        const todo1: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440004',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'First todo',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        const todo2: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440005',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Second todo',
          completed: false,
          createdAt: new Date(now.getTime() + 1000),
          updatedAt: new Date(now.getTime() + 1000),
        };

        await todoStore.save(todo1);
        await todoStore.save(todo2);

        const todos = await todoStore.findByOrganizationId(TEST_ORG_ID);
        expect(todos).toHaveLength(2);
        expect(todos[0]?.title).toBe('First todo');
        expect(todos[1]?.title).toBe('Second todo');
      });

      it('should return empty array when organization has no todos', async () => {
        const todos = await todoStore.findByOrganizationId(
          '550e8400-e29b-41d4-a716-446655440097',
        );
        expect(todos).toHaveLength(0);
      });

      it('should only return todos for the specified organization', async () => {
        const now = new Date();

        await todoStore.save({
          id: '550e8400-e29b-41d4-a716-446655440006',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Org 1 todo',
          completed: false,
          createdAt: now,
          updatedAt: now,
        });

        await todoStore.save({
          id: '550e8400-e29b-41d4-a716-446655440007',
          organizationId: TEST_ORG_2_ID,
          createdBy: TEST_USER_ID,
          title: 'Org 2 todo',
          completed: false,
          createdAt: now,
          updatedAt: now,
        });

        const org1Todos = await todoStore.findByOrganizationId(TEST_ORG_ID);
        expect(org1Todos).toHaveLength(1);
        expect(org1Todos[0]?.title).toBe('Org 1 todo');
      });
    });

    describe('update', () => {
      it('should update a todo', async () => {
        const now = new Date();
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440008',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'Original title',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        const updatedTodo: Todo = {
          ...todo,
          title: 'Updated title',
          description: 'Added description',
          updatedAt: new Date(),
        };

        await todoStore.update(updatedTodo);

        const found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();
        expect(found?.title).toBe('Updated title');
        expect(found?.description).toBe('Added description');
      });

      it('should update todo to completed state', async () => {
        const now = new Date();
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440009',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'To be completed',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        const completedTodo: Todo = {
          ...todo,
          completed: true,
          completedAt: new Date(),
          updatedAt: new Date(),
        };

        await todoStore.update(completedTodo);

        const found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();
        expect(found?.completed).toBe(true);
        expect(found?.completedAt).toBeInstanceOf(Date);
      });
    });

    describe('delete', () => {
      it('should delete a todo', async () => {
        const now = new Date();
        const todo: Todo = {
          id: '550e8400-e29b-41d4-a716-446655440010',
          organizationId: TEST_ORG_ID,
          createdBy: TEST_USER_ID,
          title: 'To be deleted',
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        await todoStore.save(todo);

        // Verify it exists
        let found = await todoStore.findById(todo.id);
        expect(found).not.toBeNull();

        // Delete it
        await todoStore.delete(todo.id);

        // Verify it's gone
        found = await todoStore.findById(todo.id);
        expect(found).toBeNull();
      });

      it('should not throw when deleting non-existent todo', async () => {
        // Should handle gracefully
        await expect(
          todoStore.delete('550e8400-e29b-41d4-a716-446655440099'),
        ).resolves.not.toThrow();
      });
    });
  });
}
