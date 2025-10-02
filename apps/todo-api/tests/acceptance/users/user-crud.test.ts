import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  createTestApp,
  cleanDatabase,
  createAuthenticatedUser,
} from '../helpers/test-helpers.js';

describe('User CRUD Operations (Acceptance)', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database and create fresh app for each test
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('POST /users - Create User - Authentication', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/users')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/users')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'Password123!',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should create user with valid token', async () => {
      // Create an authenticated user and get token
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@example.com',
          username: 'newuser',
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body.username).toBe('newuser');
    });
  });

  describe('POST /users - Create User', () => {
    it('should create a new user', async () => {
      const { token } = await createAuthenticatedUser(app);
      const newUser = {
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'SecurePassword123!',
      };

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
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
      const { token } = await createAuthenticatedUser(app);
      const user = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'Password123!',
      };

      // Create first user
      await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(user)
        .expect(201);

      // Try to create with same email
      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...user,
          username: 'differentuser',
        })
        .expect(400);

      expect(response.body.error).toBe('Unable to create account');
    });

    it('should reject duplicate username', async () => {
      const { token } = await createAuthenticatedUser(app);
      const user = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'Password123!',
      };

      // Create first user
      await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send(user)
        .expect(201);

      // Try to create with same username
      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...user,
          email: 'different@example.com',
        })
        .expect(400);

      expect(response.body.error).toBe('Username already taken');
    });

    it('should validate email format', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
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
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
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
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
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

  describe('GET /users/:id - Get User by ID - Authentication', () => {
    let userId: string;

    beforeEach(async () => {
      // Create user directly in DB for testing
      const { userId: id } = await createAuthenticatedUser(app, {
        email: 'byid@example.com',
        username: 'useridtest',
        password: 'Password123!',
      });
      userId = id;
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/users/${userId}`).expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should get user with valid token', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('byid@example.com');
    });
  });

  describe('GET /users/:id - Get User by ID', () => {
    let userId: string;

    beforeEach(async () => {
      // Create test user
      const { userId: id } = await createAuthenticatedUser(app, {
        email: 'byid@example.com',
        username: 'useridtest',
        password: 'Password123!',
      });
      userId = id;
    });

    it('should get user by ID', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: 'byid@example.com',
        username: 'useridtest',
      });
      expect(response.body.passwordHash).toBeUndefined();
    });

    it('should return 404 for non-existent ID', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/users/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should validate UUID format', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/users/invalid-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid user ID format');
    });
  });
});
