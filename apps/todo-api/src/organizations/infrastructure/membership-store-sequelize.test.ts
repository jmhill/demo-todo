import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeMembershipStore } from './membership-store-sequelize.js';
import type { OrganizationMembership } from '../domain/organization-schemas.js';
import type { Secret } from '../../config/secrets.js';

describe('SequelizeMembershipStore', () => {
  let sequelize: Sequelize;
  let membershipStore: ReturnType<typeof createSequelizeMembershipStore>;

  // Helper to create test users
  const createTestUser = async (userId: string) => {
    await sequelize.getQueryInterface().bulkInsert('users', [
      {
        id: userId,
        email: `user_${userId}@test.com`,
        username: `user_${userId}`,
        password_hash: 'test_hash',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  };

  // Helper to create test organizations
  const createTestOrganization = async (orgId: string, name: string) => {
    await sequelize.getQueryInterface().bulkInsert('organizations', [
      {
        id: orgId,
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  };

  beforeAll(async () => {
    // Connect to MySQL testcontainer (started by global setup)
    const host = process.env.TEST_DB_HOST;
    const port = process.env.TEST_DB_PORT;
    const user = process.env.TEST_DB_USER;
    const password = process.env.TEST_DB_PASSWORD;
    const database = process.env.TEST_DB_DATABASE;

    if (!host || !port || !user || !password || !database) {
      throw new Error(
        'Database config not found in environment. ' +
          'Make sure tests are running with globalSetup configured.',
      );
    }

    sequelize = new Sequelize({
      dialect: 'mysql',
      host,
      port: parseInt(port, 10),
      username: user,
      password: password as Secret,
      database,
      logging: false,
    });

    // Migrations already run by global setup
  });

  beforeEach(async () => {
    // Clean database before each test (order matters for foreign keys)
    await sequelize.getQueryInterface().bulkDelete('todos', {});
    await sequelize
      .getQueryInterface()
      .bulkDelete('organization_memberships', {});
    await sequelize.getQueryInterface().bulkDelete('organizations', {});
    await sequelize.getQueryInterface().bulkDelete('users', {});

    // Recreate store instance
    membershipStore = createSequelizeMembershipStore(sequelize);
  });

  describe('save', () => {
    it('should save a membership', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const orgId = '550e8400-e29b-41d4-a716-446655440002';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        userId,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership);

      const found = await membershipStore.findById(membership.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(membership.id);
      expect(found?.userId).toBe(userId);
      expect(found?.organizationId).toBe(orgId);
      expect(found?.role).toBe('member');
    });

    it('should save membership with different roles', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440004';
      const orgId = '550e8400-e29b-41d4-a716-446655440005';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        userId,
        organizationId: orgId,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership);

      const found = await membershipStore.findById(membership.id);
      expect(found?.role).toBe('owner');
    });
  });

  describe('findById', () => {
    it('should return membership when found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440007';
      const orgId = '550e8400-e29b-41d4-a716-446655440008';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440009',
        userId,
        organizationId: orgId,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership);

      const found = await membershipStore.findById(membership.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(membership.id);
      expect(found?.role).toBe('admin');
    });

    it('should return null when membership not found', async () => {
      const found = await membershipStore.findById(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(found).toBeNull();
    });
  });

  describe('findByUserAndOrg', () => {
    it('should return membership when user is member of org', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440010';
      const orgId = '550e8400-e29b-41d4-a716-446655440011';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440012',
        userId,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership);

      const found = await membershipStore.findByUserAndOrg({
        userId,
        organizationId: orgId,
      });
      expect(found).not.toBeNull();
      expect(found?.userId).toBe(userId);
      expect(found?.organizationId).toBe(orgId);
    });

    it('should return null when user is not member of org', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440013';
      const orgId = '550e8400-e29b-41d4-a716-446655440014';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const found = await membershipStore.findByUserAndOrg({
        userId,
        organizationId: orgId,
      });
      expect(found).toBeNull();
    });

    it('should enforce unique constraint on user-org combination', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440015';
      const orgId = '550e8400-e29b-41d4-a716-446655440016';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership1: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440017',
        userId,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership1);

      // Try to save duplicate membership
      const membership2: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440018',
        userId,
        organizationId: orgId,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      };

      await expect(membershipStore.save(membership2)).rejects.toThrow();
    });
  });

  describe('findByOrganizationId', () => {
    it('should return all members of an organization', async () => {
      const user1Id = '550e8400-e29b-41d4-a716-446655440019';
      const user2Id = '550e8400-e29b-41d4-a716-446655440020';
      const orgId = '550e8400-e29b-41d4-a716-446655440021';
      await createTestUser(user1Id);
      await createTestUser(user2Id);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();

      await membershipStore.save({
        id: '550e8400-e29b-41d4-a716-446655440022',
        userId: user1Id,
        organizationId: orgId,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      });

      await membershipStore.save({
        id: '550e8400-e29b-41d4-a716-446655440023',
        userId: user2Id,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      });

      const members = await membershipStore.findByOrganizationId(orgId);
      expect(members).toHaveLength(2);
      expect(members.map((m) => m.userId)).toContain(user1Id);
      expect(members.map((m) => m.userId)).toContain(user2Id);
    });

    it('should return empty array when organization has no members', async () => {
      const members = await membershipStore.findByOrganizationId(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(members).toHaveLength(0);
    });
  });

  describe('findByUserId', () => {
    it('should return all organizations a user belongs to', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440024';
      const org1Id = '550e8400-e29b-41d4-a716-446655440025';
      const org2Id = '550e8400-e29b-41d4-a716-446655440026';
      await createTestUser(userId);
      await createTestOrganization(org1Id, 'Org 1');
      await createTestOrganization(org2Id, 'Org 2');

      const now = new Date();

      await membershipStore.save({
        id: '550e8400-e29b-41d4-a716-446655440027',
        userId,
        organizationId: org1Id,
        role: 'owner',
        createdAt: now,
        updatedAt: now,
      });

      await membershipStore.save({
        id: '550e8400-e29b-41d4-a716-446655440028',
        userId,
        organizationId: org2Id,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      });

      const memberships = await membershipStore.findByUserId(userId);
      expect(memberships).toHaveLength(2);
      expect(memberships.map((m) => m.organizationId)).toContain(org1Id);
      expect(memberships.map((m) => m.organizationId)).toContain(org2Id);
    });

    it('should return empty array when user has no memberships', async () => {
      const memberships = await membershipStore.findByUserId(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(memberships).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update a membership role', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440029';
      const orgId = '550e8400-e29b-41d4-a716-446655440030';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440031',
        userId,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership);

      const updatedMembership: OrganizationMembership = {
        ...membership,
        role: 'admin',
        updatedAt: new Date(),
      };

      await membershipStore.update(updatedMembership);

      const found = await membershipStore.findById(membership.id);
      expect(found).not.toBeNull();
      expect(found?.role).toBe('admin');
      expect(found?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('should delete a membership', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440032';
      const orgId = '550e8400-e29b-41d4-a716-446655440033';
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440034',
        userId,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership);

      await membershipStore.delete(membership.id);

      const found = await membershipStore.findById(membership.id);
      expect(found).toBeNull();
    });

    it('should handle deleting non-existent membership gracefully', async () => {
      // Should not throw
      await membershipStore.delete('550e8400-e29b-41d4-a716-446655440099');
    });
  });
});
