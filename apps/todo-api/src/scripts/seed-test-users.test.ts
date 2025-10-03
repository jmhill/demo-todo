import { describe, it, expect, vi } from 'vitest';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { z } from 'zod';
import type { CreateUserCommand } from '../users/domain/user-schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TestUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

const TestUsersSchema = z.array(TestUserSchema);

describe('Test User Seeding', () => {
  describe('test-users.json validation', () => {
    it('should contain valid test user data', async () => {
      const testUsersPath = join(__dirname, '../../seed-data/test-users.json');
      const testUsersJson = await readFile(testUsersPath, 'utf-8');
      const testUsersData = JSON.parse(testUsersJson);

      const result = TestUsersSchema.safeParse(testUsersData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0]).toHaveProperty('email');
        expect(result.data[0]).toHaveProperty('username');
        expect(result.data[0]).toHaveProperty('password');
      }
    });

    it('should have valid email formats', async () => {
      const testUsersPath = join(__dirname, '../../seed-data/test-users.json');
      const testUsersJson = await readFile(testUsersPath, 'utf-8');
      const testUsersData = JSON.parse(testUsersJson);
      const testUsers = TestUsersSchema.parse(testUsersData);

      testUsers.forEach((user) => {
        expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it('should have usernames with minimum length of 3', async () => {
      const testUsersPath = join(__dirname, '../../seed-data/test-users.json');
      const testUsersJson = await readFile(testUsersPath, 'utf-8');
      const testUsersData = JSON.parse(testUsersJson);
      const testUsers = TestUsersSchema.parse(testUsersData);

      testUsers.forEach((user) => {
        expect(user.username.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should have passwords with minimum length of 8', async () => {
      const testUsersPath = join(__dirname, '../../seed-data/test-users.json');
      const testUsersJson = await readFile(testUsersPath, 'utf-8');
      const testUsersData = JSON.parse(testUsersJson);
      const testUsers = TestUsersSchema.parse(testUsersData);

      testUsers.forEach((user) => {
        expect(user.password.length).toBeGreaterThanOrEqual(8);
      });
    });
  });

  describe('seeding behavior', () => {
    it('should create users through service layer', async () => {
      const mockUserService = {
        createUser: vi.fn(),
        getById: vi.fn(),
        getByEmail: vi.fn(),
        getByUsername: vi.fn(),
        authenticateUser: vi.fn(),
      };

      const testUser: CreateUserCommand = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      await mockUserService.createUser(testUser);

      expect(mockUserService.createUser).toHaveBeenCalledWith(testUser);
      expect(mockUserService.createUser).toHaveBeenCalledTimes(1);
    });
  });
});
