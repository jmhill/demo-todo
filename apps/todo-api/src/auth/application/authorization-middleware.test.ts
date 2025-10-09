import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
import { requirePermissions } from './authorization-middleware.js';
import { requireOrgMembership } from './organization-middleware.js';
import { createInMemoryMembershipStore } from '../../organizations/infrastructure/membership-store-in-mem.js';
import type {
  OrganizationMembership,
  OrganizationRole,
} from '../../organizations/domain/organization-schemas.js';
import type { User } from '../../users/domain/user-schemas.js';

// Test data helpers
const createTestUser = (id: string): User => ({
  id,
  email: `${id}@example.com`,
  username: id,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

const createTestMembership = (
  id: string,
  userId: string,
  orgId: string,
  role: OrganizationRole,
): OrganizationMembership => ({
  id,
  userId,
  organizationId: orgId,
  role,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

// Mock auth middleware that attaches user to req.auth
const mockAuthMiddleware =
  (user: User | null) => (req: Request, _res: Response, next: () => void) => {
    if (user) {
      req.auth = {
        user,
        token: 'test-token',
      };
    }
    next();
  };

describe('requirePermissions middleware', () => {
  let app: Express;
  let membershipStore: ReturnType<typeof createInMemoryMembershipStore>;

  beforeEach(async () => {
    // Create fresh in-memory store
    membershipStore = createInMemoryMembershipStore();

    // Seed test data with different roles
    await membershipStore.save(
      createTestMembership('membership-1', 'member-user', 'org-1', 'member'),
    );
    await membershipStore.save(
      createTestMembership('membership-2', 'owner-user', 'org-1', 'owner'),
    );
    await membershipStore.save(
      createTestMembership('membership-3', 'admin-user', 'org-1', 'admin'),
    );
    await membershipStore.save(
      createTestMembership('membership-4', 'viewer-user', 'org-1', 'viewer'),
    );
  });

  describe('single permission checks', () => {
    it('should allow user with required permission', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('member-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:create'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny user lacking required permission', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('member-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:delete'), // members don't have delete
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(403);

      expect(response.body).toEqual({
        message: 'Missing required permission: todos:delete',
        code: 'MISSING_PERMISSION',
      });
    });
  });

  describe('multiple permission checks (ANY logic)', () => {
    it('should allow user with at least one of the required permissions', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('member-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        // Member has 'todos:update' but not 'todos:delete' or 'org:delete'
        requirePermissions('todos:update', 'todos:delete', 'org:delete'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny user with none of the required permissions', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('viewer-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        // Viewer doesn't have create or delete
        requirePermissions('todos:create', 'todos:delete'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(403);

      expect(response.body).toEqual({
        message: 'Missing required permission: todos:create',
        code: 'MISSING_PERMISSION',
      });
    });
  });

  describe('missing context handling', () => {
    it('should return 401 when auth context is missing', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(null)); // No authenticated user
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:create'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      // Will fail at requireOrgMembership before reaching requirePermissions
      const response = await request(app).get('/test/org-1').expect(401);

      expect(response.body.code).toBe('MISSING_AUTH');
    });

    it('should return 401 when orgContext is missing', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('member-user')));
      // Skip requireOrgMembership to test when orgContext is missing
      app.get(
        '/test/:orgId',
        requirePermissions('todos:create'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(401);

      expect(response.body).toEqual({
        message: 'Organization context required',
        code: 'MISSING_AUTH',
      });
    });
  });

  describe('real-world permission scenarios', () => {
    it('should allow owner to delete todos', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('owner-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:delete'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      await request(app).get('/test/org-1').expect(200);
    });

    it('should prevent member from deleting todos', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('member-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:delete'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(403);

      expect(response.body.code).toBe('MISSING_PERMISSION');
    });

    it('should allow viewer to read but not create', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('viewer-user')));

      // Viewer can read
      app.get(
        '/test/:orgId/read',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:read'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      await request(app).get('/test/org-1/read').expect(200);

      // Viewer cannot create
      app.post(
        '/test/:orgId/create',
        requireOrgMembership(membershipStore),
        requirePermissions('todos:create'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app)
        .post('/test/org-1/create')
        .expect(403);

      expect(response.body.code).toBe('MISSING_PERMISSION');
    });

    it('should allow admin to manage members', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('admin-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('org:members:invite', 'org:members:remove'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      await request(app).get('/test/org-1').expect(200);
    });

    it('should prevent member from managing members', async () => {
      app = express();
      app.use(express.json());
      app.use(mockAuthMiddleware(createTestUser('member-user')));
      app.get(
        '/test/:orgId',
        requireOrgMembership(membershipStore),
        requirePermissions('org:members:invite'),
        (_req: Request, res: Response) => {
          res.json({ success: true });
        },
      );

      const response = await request(app).get('/test/org-1').expect(403);

      expect(response.body.code).toBe('MISSING_PERMISSION');
    });
  });
});
