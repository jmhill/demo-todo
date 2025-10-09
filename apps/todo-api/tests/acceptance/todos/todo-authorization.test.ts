import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  createTestApp,
  cleanDatabase,
  createAuthenticatedUser,
  createOrganization,
  addOrgMember,
  createTodo,
} from '../helpers/test-helpers.js';

describe('Todo Authorization (Acceptance)', () => {
  let app: Express;

  beforeEach(async () => {
    await cleanDatabase();
    app = await createTestApp();
  });

  describe('Organization Membership', () => {
    it('should prevent non-members from accessing organization todos', async () => {
      const { token: token1 } = await createAuthenticatedUser(app);
      const { token: token2 } = await createAuthenticatedUser(app, {
        email: 'user2@example.com',
        username: 'user2',
      });

      // User 1 creates an organization
      const org = await createOrganization(app, token1, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // User 2 (not a member) tries to list todos
      const response = await request(app)
        .get(`/orgs/${org.id}/todos`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(403);

      expect(response.body.message).toBeDefined();
    });

    it('should allow members to create todos', async () => {
      const { token, user } = await createAuthenticatedUser(app);

      const org = await createOrganization(app, token, {
        name: 'Test Org',
        slug: 'test-org',
      });

      const response = await request(app)
        .post(`/orgs/${org.id}/todos`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test todo' })
        .expect(201);

      expect(response.body.title).toBe('Test todo');
      expect(response.body.createdBy).toBe(user.id);
    });
  });

  describe('Creator-based Authorization', () => {
    it('should allow creators to complete their own todos', async () => {
      const { token } = await createAuthenticatedUser(app);

      const org = await createOrganization(app, token, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Create todo
      const todo = await createTodo(app, token, org.id, { title: 'My todo' });

      // Complete own todo
      const response = await request(app)
        .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.completed).toBe(true);
    });

    it('should allow members to complete any todo in their organization (have todos:complete permission)', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: memberToken, user: member } =
        await createAuthenticatedUser(app, {
          email: 'member@example.com',
          username: 'member',
        });

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add member to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: member.id,
        role: 'member',
      });

      // Owner creates todo
      const todo = await createTodo(app, ownerToken, org.id, {
        title: 'Owner todo',
      });

      // Member completes it (members have todos:complete permission)
      const response = await request(app)
        .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.completed).toBe(true);
    });
  });

  describe('Permission-based Authorization', () => {
    it('should allow admins to complete any todo (has todos:complete permission)', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: adminToken, user: admin } = await createAuthenticatedUser(
        app,
        {
          email: 'admin@example.com',
          username: 'admin',
        },
      );

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add admin to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: admin.id,
        role: 'admin',
      });

      // Owner creates todo
      const todo = await createTodo(app, ownerToken, org.id, {
        title: 'Owner todo',
      });

      // Admin completes it (has todos:complete permission)
      const response = await request(app)
        .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.completed).toBe(true);
    });

    it('should prevent members from deleting todos (lacks todos:delete permission)', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: memberToken, user: member } =
        await createAuthenticatedUser(app, {
          email: 'member@example.com',
          username: 'member',
        });

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add member to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: member.id,
        role: 'member',
      });

      const todo = await createTodo(app, ownerToken, org.id, {
        title: 'Test todo',
      });

      // Member tries to delete (lacks todos:delete permission)
      const response = await request(app)
        .delete(`/orgs/${org.id}/todos/${todo.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.message).toBeDefined();
    });

    it('should allow admins to delete todos (has todos:delete permission)', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: adminToken, user: admin } = await createAuthenticatedUser(
        app,
        {
          email: 'admin@example.com',
          username: 'admin',
        },
      );

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add admin to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: admin.id,
        role: 'admin',
      });

      const todo = await createTodo(app, ownerToken, org.id, {
        title: 'Test todo',
      });

      // Admin deletes it (has todos:delete permission)
      await request(app)
        .delete(`/orgs/${org.id}/todos/${todo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/orgs/${org.id}/todos/${todo.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should allow owners to delete todos (has todos:delete permission)', async () => {
      const { token } = await createAuthenticatedUser(app);

      const org = await createOrganization(app, token, {
        name: 'Test Org',
        slug: 'test-org',
      });

      const todo = await createTodo(app, token, org.id, { title: 'Test todo' });

      // Owner deletes it (owners have all permissions)
      await request(app)
        .delete(`/orgs/${org.id}/todos/${todo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
    });
  });

  describe('Viewer Role Restrictions', () => {
    it('should allow viewers to read todos', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: viewerToken, user: viewer } =
        await createAuthenticatedUser(app, {
          email: 'viewer@example.com',
          username: 'viewer',
        });

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add viewer to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: viewer.id,
        role: 'viewer',
      });

      await createTodo(app, ownerToken, org.id, { title: 'Test todo' });

      // Viewer can list todos
      const response = await request(app)
        .get(`/orgs/${org.id}/todos`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Test todo');
    });

    it('should prevent viewers from creating todos', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: viewerToken, user: viewer } =
        await createAuthenticatedUser(app, {
          email: 'viewer@example.com',
          username: 'viewer',
        });

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add viewer to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: viewer.id,
        role: 'viewer',
      });

      // Viewer tries to create todo (lacks todos:create permission)
      const response = await request(app)
        .post(`/orgs/${org.id}/todos`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ title: 'Test todo' })
        .expect(403);

      expect(response.body.message).toBeDefined();
    });

    it('should prevent viewers from completing todos', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: viewerToken, user: viewer } =
        await createAuthenticatedUser(app, {
          email: 'viewer@example.com',
          username: 'viewer',
        });

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add viewer to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: viewer.id,
        role: 'viewer',
      });

      const todo = await createTodo(app, ownerToken, org.id, {
        title: 'Test todo',
      });

      // Viewer tries to complete todo (lacks todos:complete permission)
      const response = await request(app)
        .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

      expect(response.body.message).toBeDefined();
    });

    it('should prevent viewers from deleting todos', async () => {
      const { token: ownerToken } = await createAuthenticatedUser(app);
      const { token: viewerToken, user: viewer } =
        await createAuthenticatedUser(app, {
          email: 'viewer@example.com',
          username: 'viewer',
        });

      const org = await createOrganization(app, ownerToken, {
        name: 'Test Org',
        slug: 'test-org',
      });

      // Add viewer to organization
      await addOrgMember(app, ownerToken, org.id, {
        userId: viewer.id,
        role: 'viewer',
      });

      const todo = await createTodo(app, ownerToken, org.id, {
        title: 'Test todo',
      });

      // Viewer tries to delete todo (lacks todos:delete permission)
      const response = await request(app)
        .delete(`/orgs/${org.id}/todos/${todo.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);

      expect(response.body.message).toBeDefined();
    });
  });
});
