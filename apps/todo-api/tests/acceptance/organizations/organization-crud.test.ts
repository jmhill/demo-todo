import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  createTestApp,
  cleanDatabase,
  createAuthenticatedUser,
} from '../helpers/test-helpers.js';

describe('Organization CRUD Operations (Acceptance)', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database and create fresh app for each test
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('POST /organizations - Create Organization', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/organizations')
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should create an organization', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'My Organization',
          slug: 'my-organization',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'My Organization',
        slug: 'my-organization',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });

    it('should reject duplicate slug', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create first organization
      await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'First Org',
          slug: 'duplicate-slug',
        })
        .expect(201);

      // Try to create second organization with same slug
      const response = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Second Org',
          slug: 'duplicate-slug',
        })
        .expect(409);

      expect(response.body.code).toBe('SLUG_ALREADY_EXISTS');
    });

    it('should reject invalid slug format', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'Invalid Slug With Spaces',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /organizations/:id - Get Organization', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/organizations/550e8400-e29b-41d4-a716-446655440000')
        .expect(401);
    });

    it('should get organization by ID', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create organization
      const createResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = createResponse.body.id;

      // Get organization
      const response = await request(app)
        .get(`/organizations/${orgId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
      });
    });

    it('should return 404 for non-existent organization', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/organizations/550e8400-e29b-41d4-a716-446655440099')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.code).toBe('ORGANIZATION_NOT_FOUND');
    });
  });

  describe('GET /organizations - List User Organizations', () => {
    it('should require authentication', async () => {
      await request(app).get('/organizations').expect(401);
    });

    it('should list all organizations user belongs to', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create two organizations (in addition to the personal org created automatically)
      await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Org 1',
          slug: 'org-1',
        })
        .expect(201);

      await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Org 2',
          slug: 'org-2',
        })
        .expect(201);

      // List organizations (should include personal org + 2 created = 3 total)
      const response = await request(app)
        .get('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].name).toBeDefined();
      expect(response.body[1].name).toBeDefined();
      expect(response.body[2].name).toBeDefined();
    });

    it('should return only personal organization if user creates no additional orgs', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // User should have exactly 1 organization (their personal org)
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toContain('Organization');
    });
  });
});
