import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp, cleanDatabase } from '../helpers/test-helpers.js';

describe('User CRUD Operations (Acceptance)', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database and create fresh app for each test
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('POST /users - Create User', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'SecurePassword123!',
      };

      const response = await request(app)
        .post('/users')
        .send(newUser)
        .expect(201);

      expect(response.body).toMatchObject({
        email: newUser.email,
        username: newUser.username,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should reject duplicate email', async () => {
      const user = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'Password123!',
      };

      // Create first user
      await request(app).post('/users').send(user).expect(201);

      // Try to create with same email
      const response = await request(app)
        .post('/users')
        .send({
          ...user,
          username: 'differentuser',
        })
        .expect(409);

      expect(response.body.error).toContain('email already exists');
    });

    it('should reject duplicate username', async () => {
      const user = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'Password123!',
      };

      // Create first user
      await request(app).post('/users').send(user).expect(201);

      // Try to create with same username
      const response = await request(app)
        .post('/users')
        .send({
          ...user,
          email: 'different@example.com',
        })
        .expect(409);

      expect(response.body.error).toContain('username already exists');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'invalid-email',
          username: 'validuser',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
      expect(response.body.error).toContain('email');
    });

    it('should validate password minimum length', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'valid@example.com',
          username: 'validuser',
          password: 'short',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
      expect(response.body.error).toContain('password');
    });

    it('should validate username minimum length', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'valid@example.com',
          username: 'ab',
          password: 'Password123!',
        })
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
      expect(response.body.error).toContain('username');
    });
  });

  describe('GET /users/by-email/:email - Get User by Email', () => {
    beforeEach(async () => {
      // Create test user
      await request(app).post('/users').send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      });
    });

    it('should get user by email', async () => {
      const response = await request(app)
        .get('/users/by-email/test@example.com')
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'test@example.com',
        username: 'testuser',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .get('/users/by-email/nonexistent@example.com')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .get('/users/by-email/invalid-email')
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should handle case-insensitive email lookup', async () => {
      const response = await request(app)
        .get('/users/by-email/TEST@EXAMPLE.COM')
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
    });
  });

  describe('GET /users/by-username/:username - Get User by Username', () => {
    beforeEach(async () => {
      // Create test user
      await request(app).post('/users').send({
        email: 'username@example.com',
        username: 'uniqueuser',
        password: 'Password123!',
      });
    });

    it('should get user by username', async () => {
      const response = await request(app)
        .get('/users/by-username/uniqueuser')
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'username@example.com',
        username: 'uniqueuser',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent username', async () => {
      const response = await request(app)
        .get('/users/by-username/nonexistentuser')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle case-insensitive username lookup', async () => {
      const response = await request(app)
        .get('/users/by-username/UNIQUEUSER')
        .expect(200);

      expect(response.body.username).toBe('uniqueuser');
    });
  });

  describe('GET /users/:id - Get User by ID', () => {
    let userId: string;

    beforeEach(async () => {
      // Create test user
      const response = await request(app).post('/users').send({
        email: 'byid@example.com',
        username: 'useridtest',
        password: 'Password123!',
      });

      userId = response.body.id;
    });

    it('should get user by ID', async () => {
      const response = await request(app).get(`/users/${userId}`).expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: 'byid@example.com',
        username: 'useridtest',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app)
        .get('/users/550e8400-e29b-41d4-a716-446655440000')
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/users/invalid-uuid')
        .expect(400);

      expect(response.body.error).toBe('Invalid user ID format');
    });
  });
});
