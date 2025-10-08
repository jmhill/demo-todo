import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  createTestApp,
  cleanDatabase,
  createAuthenticatedUser,
} from '../helpers/test-helpers.js';

describe('Organization Membership Operations (Acceptance)', () => {
  let app: Express;

  beforeEach(async () => {
    // Clean database and create fresh app for each test
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('GET /organizations/:orgId/members - List Members', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/organizations/550e8400-e29b-41d4-a716-446655440000/members')
        .expect(401);
    });

    it('should list organization members', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // List members
      const response = await request(app)
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Creator should be automatically added as owner
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        organizationId: orgId,
        role: 'owner',
      });
    });

    it('should return 404 for non-existent organization', async () => {
      const { token } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/organizations/550e8400-e29b-41d4-a716-446655440099/members')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.code).toBe('ORGANIZATION_NOT_FOUND');
    });
  });

  describe('POST /organizations/:orgId/members - Add Member', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/organizations/550e8400-e29b-41d4-a716-446655440000/members')
        .send({
          userId: '550e8400-e29b-41d4-a716-446655440001',
          role: 'member',
        })
        .expect(401);
    });

    it('should add a member to organization', async () => {
      const { token } = await createAuthenticatedUser(app);
      const { user: user2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Add member
      const response = await request(app)
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: user2.id,
          role: 'member',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: user2.id,
        organizationId: orgId,
        role: 'member',
      });
      expect(response.body.id).toBeDefined();
    });

    it('should reject duplicate membership', async () => {
      const { token, user } = await createAuthenticatedUser(app);

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Try to add creator again (they're already owner)
      const response = await request(app)
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: user.id,
          role: 'member',
        })
        .expect(409);

      expect(response.body.code).toBe('USER_ALREADY_MEMBER');
    });
  });

  describe('PATCH /organizations/:orgId/members/:membershipId - Update Role', () => {
    it('should require authentication', async () => {
      await request(app)
        .patch(
          '/organizations/550e8400-e29b-41d4-a716-446655440000/members/550e8400-e29b-41d4-a716-446655440001',
        )
        .send({ role: 'admin' })
        .expect(401);
    });

    it('should update member role', async () => {
      const { token } = await createAuthenticatedUser(app);
      const { user: user2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Add member
      const memberResponse = await request(app)
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: user2.id,
          role: 'member',
        })
        .expect(201);

      const membershipId = memberResponse.body.id;

      // Update role
      const response = await request(app)
        .patch(`/organizations/${orgId}/members/${membershipId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: membershipId,
        role: 'admin',
      });
    });

    it('should prevent changing last owner role', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Get creator's membership
      const membersResponse = await request(app)
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ownerMembershipId = membersResponse.body[0].id;

      // Try to change owner role
      const response = await request(app)
        .patch(`/organizations/${orgId}/members/${ownerMembershipId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'member' })
        .expect(400);

      expect(response.body.code).toBe('CANNOT_CHANGE_LAST_OWNER');
    });
  });

  describe('DELETE /organizations/:orgId/members/:membershipId - Remove Member', () => {
    it('should require authentication', async () => {
      await request(app)
        .delete(
          '/organizations/550e8400-e29b-41d4-a716-446655440000/members/550e8400-e29b-41d4-a716-446655440001',
        )
        .expect(401);
    });

    it('should remove a member', async () => {
      const { token } = await createAuthenticatedUser(app);
      const { user: user2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Add member
      const memberResponse = await request(app)
        .post(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: user2.id,
          role: 'member',
        })
        .expect(201);

      const membershipId = memberResponse.body.id;

      // Remove member
      await request(app)
        .delete(`/organizations/${orgId}/members/${membershipId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      // Verify member was removed
      const membersResponse = await request(app)
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(membersResponse.body).toHaveLength(1); // Only owner remains
    });

    it('should prevent removing last owner', async () => {
      const { token } = await createAuthenticatedUser(app);

      // Create organization
      const orgResponse = await request(app)
        .post('/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Org',
          slug: 'test-org',
        })
        .expect(201);

      const orgId = orgResponse.body.id;

      // Get creator's membership
      const membersResponse = await request(app)
        .get(`/organizations/${orgId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ownerMembershipId = membersResponse.body[0].id;

      // Try to remove owner
      const response = await request(app)
        .delete(`/organizations/${orgId}/members/${ownerMembershipId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.code).toBe('CANNOT_REMOVE_LAST_OWNER');
    });
  });
});
