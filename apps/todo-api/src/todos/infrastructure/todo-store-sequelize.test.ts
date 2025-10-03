import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeTodoStore } from './todo-store-sequelize.js';
import type { Todo } from '../domain/todo-schemas.js';
import { createMigrator } from '../../database/migrator.js';

describe('SequelizeTodoStore', () => {
  let sequelize: Sequelize;
  let todoStore: ReturnType<typeof createSequelizeTodoStore>;

  // Helper to create test users
  const createTestUser = async (userId: string) => {
    await sequelize.getQueryInterface().bulkInsert('users', [
      {
        id: userId,
        email: `user_${userId}@test.com`,
        username: `user_${userId}`,
        password_hash: 'test_hash',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  };

  beforeAll(async () => {
    // Create in-memory SQLite instance
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    });

    // Run migrations
    const migrator = createMigrator(sequelize, { logger: undefined });
    await migrator.up();
  });

  beforeEach(async () => {
    // Clean database before each test
    await sequelize.getQueryInterface().bulkDelete('todos', {});
    await sequelize.getQueryInterface().bulkDelete('users', {});

    // Recreate store instance
    todoStore = createSequelizeTodoStore(sequelize);
  });

  describe('save', () => {
    it('should save a todo', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId,
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
      expect(found?.userId).toBe(todo.userId);
      expect(found?.title).toBe(todo.title);
      expect(found?.description).toBe(todo.description);
      expect(found?.completed).toBe(false);
    });

    it('should save a todo without description', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId,
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
  });

  describe('findById', () => {
    it('should return todo when found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        userId,
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
    });

    it('should return null when todo not found', async () => {
      const found = await todoStore.findById(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return all todos for a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestUser(userId);

      const now = new Date();

      const todo1: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        userId,
        title: 'First todo',
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      const todo2: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        userId,
        title: 'Second todo',
        completed: false,
        createdAt: new Date(now.getTime() + 1000),
        updatedAt: new Date(now.getTime() + 1000),
      };

      await todoStore.save(todo1);
      await todoStore.save(todo2);

      const todos = await todoStore.findByUserId(userId);
      expect(todos).toHaveLength(2);
      expect(todos[0]?.title).toBe('First todo');
      expect(todos[1]?.title).toBe('Second todo');
    });

    it('should return empty array when user has no todos', async () => {
      const todos = await todoStore.findByUserId(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(todos).toHaveLength(0);
    });

    it('should only return todos for the specified user', async () => {
      const user1Id = '550e8400-e29b-41d4-a716-446655440098';
      const user2Id = '550e8400-e29b-41d4-a716-446655440099';
      await createTestUser(user1Id);
      await createTestUser(user2Id);

      const now = new Date();

      await todoStore.save({
        id: '550e8400-e29b-41d4-a716-446655440005',
        userId: user1Id,
        title: 'User 1 todo',
        completed: false,
        createdAt: now,
        updatedAt: now,
      });

      await todoStore.save({
        id: '550e8400-e29b-41d4-a716-446655440006',
        userId: user2Id,
        title: 'User 2 todo',
        completed: false,
        createdAt: now,
        updatedAt: now,
      });

      const user1Todos = await todoStore.findByUserId(user1Id);
      expect(user1Todos).toHaveLength(1);
      expect(user1Todos[0]?.title).toBe('User 1 todo');
    });
  });

  describe('update', () => {
    it('should update a todo', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        userId,
        title: 'Original title',
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      await todoStore.save(todo);

      const updatedTodo: Todo = {
        ...todo,
        title: 'Updated title',
        completed: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      await todoStore.update(updatedTodo);

      const found = await todoStore.findById(todo.id);
      expect(found).not.toBeNull();
      expect(found?.title).toBe('Updated title');
      expect(found?.completed).toBe(true);
      expect(found?.completedAt).toBeInstanceOf(Date);
    });
  });
});
