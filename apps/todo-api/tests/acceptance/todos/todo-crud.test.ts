import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { TodoResponseDto } from '../../../src/todos/application/todo-dto-schemas.js';
import {
  createTestApp,
  cleanDatabase,
  createAuthenticatedUser,
} from '../helpers/test-helpers.js';

describe('Todo CRUD Operations (Acceptance)', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database and create fresh app for each test
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('POST /todos - Create Todo', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/todos')
        .send({
          title: 'Test todo',
          description: 'Test description',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create a new todo', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Buy groceries',
          description: 'Milk, eggs, bread',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Buy groceries',
        description: 'Milk, eggs, bread',
        completed: false,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.userId).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
      expect(response.body.completedAt).toBeUndefined();
    });

    it('should create a todo without description', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Simple todo',
        })
        .expect(201);

      expect(response.body.title).toBe('Simple todo');
      expect(response.body.description).toBeUndefined();
      expect(response.body.completed).toBe(false);
    });

    it('should reject empty title', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /todos - List Todos', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/todos').expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return all todos for authenticated user', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create multiple todos
      await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'First todo' });

      await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Second todo', description: 'With description' });

      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);

      // Verify both todos are present (order-agnostic)
      const titles = response.body.map((todo: TodoResponseDto) => todo.title);
      expect(titles).toContain('First todo');
      expect(titles).toContain('Second todo');

      // Verify todo with description has it
      const todoWithDesc = response.body.find(
        (t: TodoResponseDto) => t.title === 'Second todo',
      );
      expect(todoWithDesc.description).toBe('With description');
    });

    it('should return empty array when user has no todos', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should only return todos for authenticated user', async () => {
      const { token: token1 } = await createAuthenticatedUser(app);
      const { token: token2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // Create todos for user 1
      await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'User 1 todo' });

      // Create todos for user 2
      await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'User 2 todo' });

      // User 1 should only see their own todos
      const response = await request(app)
        .get('/todos')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('User 1 todo');
    });
  });

  describe('GET /todos/:id - Get Todo by ID', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/todos/550e8400-e29b-41d4-a716-446655440000')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should return todo when found and authorized', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create a todo
      const createResponse = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test todo', description: 'Test description' });

      const todoId = createResponse.body.id;

      // Get the todo
      const response = await request(app)
        .get(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(todoId);
      expect(response.body.title).toBe('Test todo');
      expect(response.body.description).toBe('Test description');
    });

    it('should return 404 when todo not found', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/todos/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid todo ID format', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/todos/not-a-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 403 when accessing another users todo', async () => {
      const { token: token1 } = await createAuthenticatedUser(app);
      const { token: token2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // User 1 creates a todo
      const createResponse = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'User 1 todo' });

      const todoId = createResponse.body.id;

      // User 2 tries to access it
      const response = await request(app)
        .get(`/todos/${todoId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PATCH /todos/:id/complete - Complete Todo', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .patch('/todos/550e8400-e29b-41d4-a716-446655440000/complete')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should mark todo as completed', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create a todo
      const createResponse = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Todo to complete' });

      const todoId = createResponse.body.id;

      // Complete the todo
      const response = await request(app)
        .patch(`/todos/${todoId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(todoId);
      expect(response.body.completed).toBe(true);
      expect(response.body.completedAt).toBeDefined();
    });

    it('should return 404 when todo not found', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .patch('/todos/550e8400-e29b-41d4-a716-446655440099/complete')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when todo is already completed', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create and complete a todo
      const createResponse = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Todo to complete' });

      const todoId = createResponse.body.id;

      // Complete it first time
      await request(app)
        .patch(`/todos/${todoId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Try to complete again
      const response = await request(app)
        .patch(`/todos/${todoId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 403 when completing another users todo', async () => {
      const { token: token1 } = await createAuthenticatedUser(app);
      const { token: token2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // User 1 creates a todo
      const createResponse = await request(app)
        .post('/todos')
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'User 1 todo' });

      const todoId = createResponse.body.id;

      // User 2 tries to complete it
      const response = await request(app)
        .patch(`/todos/${todoId}/complete`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });
  });
});
