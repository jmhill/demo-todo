import { describe, it, expect, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { z } from 'zod';
import { createUserService } from '../users/domain/user-service.js';
import { createInMemoryUserStore } from '../users/infrastructure/user-store-in-mem.js';
import { createMockPasswordHasher } from '../users/infrastructure/password-hasher-fake.js';
import { createTodoService } from '../todos/domain/todo-service.js';
import { createInMemoryTodoStore } from '../todos/infrastructure/todo-store-in-mem.js';
import {
  createUuidIdGenerator,
  createSystemClock,
} from '@demo-todo/infrastructure';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TestTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean().optional(),
});

const SharedOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
});

const MembershipSchema = z.object({
  organizationSlug: z.string(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

const TestUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  memberships: z.array(MembershipSchema).optional(),
  todos: z.record(z.string(), z.array(TestTodoSchema)).optional(),
});

const TestDataSchema = z.object({
  sharedOrganizations: z.array(SharedOrganizationSchema),
  users: z.array(TestUserSchema),
});

describe('Test User Seeding', () => {
  describe('test-users.json validation', () => {
    it('should contain valid test data structure', async () => {
      const testDataPath = join(__dirname, '../../seed-data/test-users.json');
      const testDataJson = await readFile(testDataPath, 'utf-8');
      const testDataParsed = JSON.parse(testDataJson);

      const result = TestDataSchema.safeParse(testDataParsed);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.users.length).toBeGreaterThan(0);
        expect(result.data.users[0]).toHaveProperty('email');
        expect(result.data.users[0]).toHaveProperty('username');
        expect(result.data.users[0]).toHaveProperty('password');
        expect(result.data.sharedOrganizations).toBeDefined();
      }
    });

    it('should have valid email formats', async () => {
      const testDataPath = join(__dirname, '../../seed-data/test-users.json');
      const testDataJson = await readFile(testDataPath, 'utf-8');
      const testDataParsed = JSON.parse(testDataJson);
      const testData = TestDataSchema.parse(testDataParsed);

      testData.users.forEach((user) => {
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should have usernames with minimum length of 3', async () => {
      const testDataPath = join(__dirname, '../../seed-data/test-users.json');
      const testDataJson = await readFile(testDataPath, 'utf-8');
      const testDataParsed = JSON.parse(testDataJson);
      const testData = TestDataSchema.parse(testDataParsed);

      testData.users.forEach((user) => {
        expect(user.username.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should have passwords with minimum length of 8', async () => {
      const testDataPath = join(__dirname, '../../seed-data/test-users.json');
      const testDataJson = await readFile(testDataPath, 'utf-8');
      const testDataParsed = JSON.parse(testDataJson);
      const testData = TestDataSchema.parse(testDataParsed);

      testData.users.forEach((user) => {
        expect(user.password.length).toBeGreaterThanOrEqual(8);
      });
    });

    it('should have valid todos when present', async () => {
      const testDataPath = join(__dirname, '../../seed-data/test-users.json');
      const testDataJson = await readFile(testDataPath, 'utf-8');
      const testDataParsed = JSON.parse(testDataJson);
      const testData = TestDataSchema.parse(testDataParsed);

      testData.users.forEach((user) => {
        if (user.todos) {
          // Todos is now a record (object), not an array
          Object.values(user.todos).forEach((todosArray) => {
            expect(Array.isArray(todosArray)).toBe(true);
            todosArray.forEach((todo) => {
              expect(todo.title).toBeTruthy();
              expect(todo.title.length).toBeGreaterThan(0);
              expect(todo.title.length).toBeLessThanOrEqual(500);
              if (todo.description) {
                expect(todo.description.length).toBeLessThanOrEqual(2000);
              }
            });
          });
        }
      });
    });
  });

  describe('seeding behavior', () => {
    let userService: ReturnType<typeof createUserService>;
    let todoService: ReturnType<typeof createTodoService>;
    let userStore: ReturnType<typeof createInMemoryUserStore>;
    let todoStore: ReturnType<typeof createInMemoryTodoStore>;

    beforeEach(() => {
      userStore = createInMemoryUserStore();
      userService = createUserService(
        userStore,
        createMockPasswordHasher(),
        createUuidIdGenerator(),
        createSystemClock(),
      );

      todoStore = createInMemoryTodoStore();
      todoService = createTodoService(
        todoStore,
        createUuidIdGenerator(),
        createSystemClock(),
      );
    });

    it('should create users through service layer', async () => {
      const testUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = await userService.createUser(testUser);

      expect(result.isOk()).toBe(true);
      if (!result.isOk()) return;

      const createdUser = result.value;
      expect(createdUser.email).toBe(testUser.email);
      expect(createdUser.username).toBe(testUser.username);
      expect(createdUser.id).toBeDefined();

      // Verify user exists in store
      const storedUser = await userStore.findByUsername(testUser.username);
      expect(storedUser).toBeDefined();
      expect(storedUser?.id).toBe(createdUser.id);
    });

    it('should create todos for users when todos are present', async () => {
      // First create a user
      const userResult = await userService.createUser({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });
      expect(userResult.isOk()).toBe(true);
      if (!userResult.isOk()) return;

      const user = userResult.value;
      const organizationId = user.id; // In the real script, user's personal org

      // Create todos for the user
      const todos = [
        { title: 'Test todo 1', description: 'Description 1' },
        { title: 'Test todo 2', description: undefined },
      ];

      const createdTodos = [];
      for (const todo of todos) {
        const todoResult = await todoService.createTodo({
          organizationId,
          createdBy: user.id,
          title: todo.title,
          description: todo.description,
        });

        expect(todoResult.isOk()).toBe(true);
        if (todoResult.isOk()) {
          createdTodos.push(todoResult.value);
        }
      }

      expect(createdTodos).toHaveLength(2);
      expect(createdTodos[0]).toBeDefined();
      expect(createdTodos[1]).toBeDefined();
      expect(createdTodos[0]?.title).toBe('Test todo 1');
      expect(createdTodos[0]?.description).toBe('Description 1');
      expect(createdTodos[1]?.title).toBe('Test todo 2');
      expect(createdTodos[1]?.description).toBeUndefined();

      // Verify todos exist in store
      const storedTodos = await todoStore.findByOrganizationId(organizationId);
      expect(storedTodos.length).toBe(2);
    });
  });
});
