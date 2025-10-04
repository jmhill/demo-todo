import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  createTestApp,
  cleanDatabase,
  createAuthenticatedUser,
} from '../helpers/test-helpers.js';

describe('Auth API - Login and Logout', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database and create fresh app for each test
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('POST /auth/login', () => {
    it('should login with valid username and password', async () => {
      // Create a user directly in DB (bypassing API which now requires auth)
      await createAuthenticatedUser(app, {
        email: 'testlogin@example.com',
        username: 'testlogin',
        password: 'SecurePass123!',
      });

      // Then login
      const response = await request(app).post('/auth/login').send({
        usernameOrEmail: 'testlogin',
        password: 'SecurePass123!',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testlogin');
      expect(response.body.user.email).toBe('testlogin@example.com');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should login with valid email and password', async () => {
      // Create a user directly in DB (bypassing API which now requires auth)
      await createAuthenticatedUser(app, {
        email: 'emaillogin@example.com',
        username: 'emailloginuser',
        password: 'SecurePass123!',
      });

      // Then login with email
      const response = await request(app).post('/auth/login').send({
        usernameOrEmail: 'emaillogin@example.com',
        password: 'SecurePass123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('emaillogin@example.com');
    });

    it('should reject login with invalid password', async () => {
      // Create a user directly in DB (bypassing API which now requires auth)
      await createAuthenticatedUser(app, {
        email: 'wrongpass@example.com',
        username: 'wrongpassuser',
        password: 'CorrectPassword123!',
      });

      // Try to login with wrong password
      const response = await request(app).post('/auth/login').send({
        usernameOrEmail: 'wrongpassuser',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });

    it('should reject login for non-existent user', async () => {
      const response = await request(app).post('/auth/login').send({
        usernameOrEmail: 'nonexistent',
        password: 'SomePassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app).post('/auth/login').send({
        usernameOrEmail: 'testuser',
      });

      expect(response.status).toBe(400);
      // ts-rest returns validation errors in a different format
      expect(response.body).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout with valid token', async () => {
      // Create user and get token
      const { token } = await createAuthenticatedUser(app, {
        email: 'logout@example.com',
        username: 'logoutuser',
        password: 'SecurePass123!',
      });

      // Logout
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);
    });

    it('should reject logout without token', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });

    it('should reject logout with malformed authorization header', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBeDefined();
    });
  });
});
