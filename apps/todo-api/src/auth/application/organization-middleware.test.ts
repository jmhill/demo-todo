import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express, type Request, type Response } from 'express';
import request from 'supertest';
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

describe('requireOrgMembership middleware', () => {
  let app: Express;
  let membershipStore: ReturnType<typeof createInMemoryMembershipStore>;

  beforeEach(async () => {
    // Create fresh in-memory store
    membershipStore = createInMemoryMembershipStore();

    // Seed test data: user1 is member of org1, user2 is owner of org2
    await membershipStore.save(
      createTestMembership('membership-1', 'user-1', 'org-1', 'member'),
    );
    await membershipStore.save(
      createTestMembership('membership-2', 'user-2', 'org-2', 'owner'),
    );
    await membershipStore.save(
      createTestMembership('membership-3', 'user-3', 'org-3', 'admin'),
    );
    await membershipStore.save(
      createTestMembership('membership-4', 'user-4', 'org-4', 'viewer'),
    );
  });

  it('should allow member to access their organization', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-1')));
    app.get(
      '/test/:orgId',
      requireOrgMembership(membershipStore),
      (req: Request, res: Response) => {
        res.json({
          success: true,
          orgContext: req.auth?.orgContext,
        });
      },
    );

    const response = await request(app).get('/test/org-1').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.orgContext).toEqual({
      organizationId: 'org-1',
      membership: expect.objectContaining({
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'member',
      }),
      permissions: [
        'todos:create',
        'todos:read',
        'todos:update',
        'todos:complete',
        'org:members:read',
      ],
    });
  });

  it('should resolve owner permissions correctly', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-2')));
    app.get(
      '/test/:orgId',
      requireOrgMembership(membershipStore),
      (req: Request, res: Response) => {
        res.json({ permissions: req.auth?.orgContext?.permissions });
      },
    );

    const response = await request(app).get('/test/org-2').expect(200);

    expect(response.body.permissions).toEqual([
      'todos:create',
      'todos:read',
      'todos:update',
      'todos:delete',
      'todos:complete',
      'org:members:read',
      'org:members:invite',
      'org:members:remove',
      'org:members:update-role',
      'org:settings:read',
      'org:settings:update',
      'org:delete',
    ]);
  });

  it('should resolve admin permissions correctly', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-3')));
    app.get(
      '/test/:orgId',
      requireOrgMembership(membershipStore),
      (req: Request, res: Response) => {
        res.json({ permissions: req.auth?.orgContext?.permissions });
      },
    );

    const response = await request(app).get('/test/org-3').expect(200);

    expect(response.body.permissions).toEqual([
      'todos:create',
      'todos:read',
      'todos:update',
      'todos:delete',
      'todos:complete',
      'org:members:read',
      'org:members:invite',
      'org:members:remove',
      'org:settings:read',
    ]);
  });

  it('should resolve viewer permissions correctly', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-4')));
    app.get(
      '/test/:orgId',
      requireOrgMembership(membershipStore),
      (req: Request, res: Response) => {
        res.json({ permissions: req.auth?.orgContext?.permissions });
      },
    );

    const response = await request(app).get('/test/org-4').expect(200);

    expect(response.body.permissions).toEqual([
      'todos:read',
      'org:members:read',
      'org:settings:read',
    ]);
  });

  it('should return 401 when user is not authenticated', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(null)); // No user
    app.get(
      '/test/:orgId',
      requireOrgMembership(membershipStore),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app).get('/test/org-1').expect(401);

    expect(response.body).toEqual({
      message: 'Authentication required',
      code: 'MISSING_AUTH',
    });
  });

  it('should return 400 when orgId param is missing', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-1')));
    // Route without :orgId param
    app.get(
      '/test',
      requireOrgMembership(membershipStore),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app).get('/test').expect(400);

    expect(response.body).toEqual({
      message: 'Organization ID required',
      code: 'INVALID_REQUEST',
    });
  });

  it('should return 403 when user is not a member of the organization', async () => {
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-1')));
    app.get(
      '/test/:orgId',
      requireOrgMembership(membershipStore),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    // user-1 is not a member of org-2
    const response = await request(app).get('/test/org-2').expect(403);

    expect(response.body).toEqual({
      message: 'Not a member of this organization',
      code: 'NOT_MEMBER',
    });
  });

  it('should return 500 when database query fails', async () => {
    // Create a store that throws errors
    const faultyStore = {
      ...membershipStore,
      findByUserAndOrg: async () => {
        throw new Error('Database connection failed');
      },
    };

    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware(createTestUser('user-1')));
    app.get(
      '/test/:orgId',
      requireOrgMembership(faultyStore),
      (_req: Request, res: Response) => {
        res.json({ success: true });
      },
    );

    const response = await request(app).get('/test/org-1').expect(500);

    expect(response.body).toEqual({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });
});
