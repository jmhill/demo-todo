import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { OrganizationMembershipStore } from '../domain/organization-service.js';
import type { OrganizationMembership } from '../domain/organization-schemas.js';

/**
 * Shared contract tests for OrganizationMembershipStore implementations.
 *
 * These tests ensure all adapters (Sequelize, in-memory) behave identically
 * and implement the OrganizationMembershipStore interface contract correctly.
 *
 * Note: Some adapters may have foreign key constraints requiring users and
 * organizations to exist. The setupDependencies hook allows adapters to
 * create these dependencies before tests run.
 */
export function runMembershipStoreContractTests(options: {
  createStore: () =>
    | OrganizationMembershipStore
    | Promise<OrganizationMembershipStore>;
  setupDependencies?: (data: {
    userId: string;
    user2Id?: string;
    organizationId: string;
    organization2Id?: string;
  }) => void | Promise<void>;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
}) {
  let membershipStore: OrganizationMembershipStore;

  // Standard test data IDs
  const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
  const TEST_USER_2_ID = '550e8400-e29b-41d4-a716-446655440002';
  const TEST_ORG_ID = '550e8400-e29b-41d4-a716-446655440003';
  const TEST_ORG_2_ID = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(async () => {
    if (options.beforeEach) await options.beforeEach();
    membershipStore = await options.createStore();
    // Set up any dependencies (users, orgs) required by the adapter
    if (options.setupDependencies) {
      await options.setupDependencies({
        userId: TEST_USER_ID,
        user2Id: TEST_USER_2_ID,
        organizationId: TEST_ORG_ID,
        organization2Id: TEST_ORG_2_ID,
      });
    }
  });

  afterEach(async () => {
    if (options.afterEach) await options.afterEach();
  });

  describe('OrganizationMembershipStore Contract', () => {
    describe('save', () => {
      it('should save a membership', async () => {
        const now = new Date();
        const membership: OrganizationMembership = {
          id: '550e8400-e29b-41d4-a716-446655440010',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
          role: 'member',
          createdAt: now,
          updatedAt: now,
        };

        await membershipStore.save(membership);

        const found = await membershipStore.findById(membership.id);
        expect(found).not.toBeNull();
        expect(found?.id).toBe(membership.id);
        expect(found?.userId).toBe(TEST_USER_ID);
        expect(found?.organizationId).toBe(TEST_ORG_ID);
        expect(found?.role).toBe('member');
      });

      it('should save membership with different roles', async () => {
        const now = new Date();
        const membership: OrganizationMembership = {
          id: '550e8400-e29b-41d4-a716-446655440011',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
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
        const now = new Date();
        const membership: OrganizationMembership = {
          id: '550e8400-e29b-41d4-a716-446655440012',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
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
        const now = new Date();
        const membership: OrganizationMembership = {
          id: '550e8400-e29b-41d4-a716-446655440013',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
          role: 'member',
          createdAt: now,
          updatedAt: now,
        };

        await membershipStore.save(membership);

        const found = await membershipStore.findByUserAndOrg({
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
        });
        expect(found).not.toBeNull();
        expect(found?.userId).toBe(TEST_USER_ID);
        expect(found?.organizationId).toBe(TEST_ORG_ID);
      });

      it('should return null when user is not member of org', async () => {
        const found = await membershipStore.findByUserAndOrg({
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
        });
        expect(found).toBeNull();
      });
    });

    describe('findByOrganizationId', () => {
      it('should return all members of an organization', async () => {
        const now = new Date();

        await membershipStore.save({
          id: '550e8400-e29b-41d4-a716-446655440014',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        });

        await membershipStore.save({
          id: '550e8400-e29b-41d4-a716-446655440015',
          userId: TEST_USER_2_ID,
          organizationId: TEST_ORG_ID,
          role: 'member',
          createdAt: now,
          updatedAt: now,
        });

        const members = await membershipStore.findByOrganizationId(TEST_ORG_ID);
        expect(members).toHaveLength(2);
        expect(members.map((m) => m.userId)).toContain(TEST_USER_ID);
        expect(members.map((m) => m.userId)).toContain(TEST_USER_2_ID);
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
        const now = new Date();

        await membershipStore.save({
          id: '550e8400-e29b-41d4-a716-446655440016',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
          role: 'owner',
          createdAt: now,
          updatedAt: now,
        });

        await membershipStore.save({
          id: '550e8400-e29b-41d4-a716-446655440017',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_2_ID,
          role: 'member',
          createdAt: now,
          updatedAt: now,
        });

        const memberships = await membershipStore.findByUserId(TEST_USER_ID);
        expect(memberships).toHaveLength(2);
        expect(memberships.map((m) => m.organizationId)).toContain(TEST_ORG_ID);
        expect(memberships.map((m) => m.organizationId)).toContain(
          TEST_ORG_2_ID,
        );
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
        const now = new Date();
        const membership: OrganizationMembership = {
          id: '550e8400-e29b-41d4-a716-446655440018',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
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
        const now = new Date();
        const membership: OrganizationMembership = {
          id: '550e8400-e29b-41d4-a716-446655440019',
          userId: TEST_USER_ID,
          organizationId: TEST_ORG_ID,
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
        await expect(
          membershipStore.delete('550e8400-e29b-41d4-a716-446655440099'),
        ).resolves.not.toThrow();
      });
    });
  });
}
