import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeTodoStore } from './todo-store-sequelize.js';
import type { Todo } from '../domain/todo-schemas.js';
import type { Secret } from '../../config/secrets.js';

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

  // Helper to create test organizations
  const createTestOrganization = async (orgId: string, name: string) => {
    await sequelize.getQueryInterface().bulkInsert('organizations', [
      {
        id: orgId,
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  };

  beforeAll(async () => {
    // Connect to MySQL testcontainer (started by global setup)
    const host = process.env.TEST_DB_HOST;
    const port = process.env.TEST_DB_PORT;
    const user = process.env.TEST_DB_USER;
    const password = process.env.TEST_DB_PASSWORD;
    const database = process.env.TEST_DB_DATABASE;

    if (!host || !port || !user || !password || !database) {
      throw new Error(
        'Database config not found in environment. ' +
          'Make sure tests are running with globalSetup configured.',
      );
    }

    sequelize = new Sequelize({
      dialect: 'mysql',
      host,
      port: parseInt(port, 10),
      username: user,
      password: password as Secret,
      database,
      logging: false,
    });

    // Migrations already run by global setup
  });

  beforeEach(async () => {
    // Clean database before each test (order matters for foreign keys)
    await sequelize.getQueryInterface().bulkDelete('todos', {});
    await sequelize
      .getQueryInterface()
      .bulkDelete('organization_memberships', {});
    await sequelize.getQueryInterface().bulkDelete('organizations', {});
    await sequelize.getQueryInterface().bulkDelete('users', {});

    // Recreate store instance
    todoStore = createSequelizeTodoStore(sequelize);
  });

  describe('save', () => {
    it('should save a todo', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440098';
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestOrganization(organizationId, 'Test Org');
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        organizationId,
        createdBy: userId,
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

    it('should save a todo without description', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440098';
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestOrganization(organizationId, 'Test Org');
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        organizationId,
        createdBy: userId,
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
      const organizationId = '550e8400-e29b-41d4-a716-446655440098';
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestOrganization(organizationId, 'Test Org');
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        organizationId,
        createdBy: userId,
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

  describe('findByOrganizationId', () => {
    it('should return all todos for an organization', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440098';
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestOrganization(organizationId, 'Test Org');
      await createTestUser(userId);

      const now = new Date();

      const todo1: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        organizationId,
        createdBy: userId,
        title: 'First todo',
        completed: false,
        createdAt: now,
        updatedAt: now,
      };

      const todo2: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        organizationId,
        createdBy: userId,
        title: 'Second todo',
        completed: false,
        createdAt: new Date(now.getTime() + 1000),
        updatedAt: new Date(now.getTime() + 1000),
      };

      await todoStore.save(todo1);
      await todoStore.save(todo2);

      const todos = await todoStore.findByOrganizationId(organizationId);
      expect(todos).toHaveLength(2);
      expect(todos[0]?.title).toBe('First todo');
      expect(todos[1]?.title).toBe('Second todo');
    });

    it('should return empty array when organization has no todos', async () => {
      const todos = await todoStore.findByOrganizationId(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(todos).toHaveLength(0);
    });

    it('should only return todos for the specified organization', async () => {
      const org1Id = '550e8400-e29b-41d4-a716-446655440097';
      const org2Id = '550e8400-e29b-41d4-a716-446655440098';
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestOrganization(org1Id, 'Org 1');
      await createTestOrganization(org2Id, 'Org 2');
      await createTestUser(userId);

      const now = new Date();

      await todoStore.save({
        id: '550e8400-e29b-41d4-a716-446655440005',
        organizationId: org1Id,
        createdBy: userId,
        title: 'Org 1 todo',
        completed: false,
        createdAt: now,
        updatedAt: now,
      });

      await todoStore.save({
        id: '550e8400-e29b-41d4-a716-446655440006',
        organizationId: org2Id,
        createdBy: userId,
        title: 'Org 2 todo',
        completed: false,
        createdAt: now,
        updatedAt: now,
      });

      const org1Todos = await todoStore.findByOrganizationId(org1Id);
      expect(org1Todos).toHaveLength(1);
      expect(org1Todos[0]?.title).toBe('Org 1 todo');
    });
  });

  describe('update', () => {
    it('should update a todo', async () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440098';
      const userId = '550e8400-e29b-41d4-a716-446655440099';
      await createTestOrganization(organizationId, 'Test Org');
      await createTestUser(userId);

      const now = new Date();
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        organizationId,
        createdBy: userId,
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
