import { describe, it, expect, beforeEach } from 'vitest';
import {
  createIncrementingClock,
  createUuidIdGenerator,
} from '@demo-todo/infrastructure';
import { createOrganizationService } from './organization-service.js';
import { createInMemoryOrganizationStore } from '../infrastructure/organization-store-in-mem.js';
import { createInMemoryMembershipStore } from '../infrastructure/membership-store-in-mem.js';
import type {
  CreateOrganizationCommand,
  AddMemberCommand,
  UpdateMemberRoleCommand,
} from './organization-schemas.js';

describe('OrganizationService', () => {
  let organizationService: ReturnType<typeof createOrganizationService>;
  let orgStore: ReturnType<typeof createInMemoryOrganizationStore>;
  let membershipStore: ReturnType<typeof createInMemoryMembershipStore>;

  beforeEach(() => {
    orgStore = createInMemoryOrganizationStore();
    membershipStore = createInMemoryMembershipStore();
    organizationService = createOrganizationService(
      orgStore,
      membershipStore,
      createUuidIdGenerator(),
      createIncrementingClock(),
    );
  });

  describe('createOrganization', () => {
    it('should create a new organization with valid data', async () => {
      const command: CreateOrganizationCommand = {
        name: 'Acme Corp',
        slug: 'acme-corp',
        createdByUserId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = await organizationService.createOrganization(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.name).toBe(command.name);
        expect(result.value.slug).toBe(command.slug);
        expect(result.value.id).toBeDefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should create owner membership for the creator', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const command: CreateOrganizationCommand = {
        name: 'Test Org',
        slug: 'test-org',
        createdByUserId: userId,
      };

      const result = await organizationService.createOrganization(command);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const orgId = result.value.id;

        // Verify owner membership was created
        const membership = await membershipStore.findByUserAndOrg({
          userId,
          organizationId: orgId,
        });
        expect(membership).toBeDefined();
        expect(membership?.role).toBe('owner');
        expect(membership?.userId).toBe(userId);
      }
    });

    it('should reject duplicate slug', async () => {
      const command1: CreateOrganizationCommand = {
        name: 'First Org',
        slug: 'duplicate-slug',
        createdByUserId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const command2: CreateOrganizationCommand = {
        name: 'Second Org',
        slug: 'duplicate-slug',
        createdByUserId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result1 = await organizationService.createOrganization(command1);
      expect(result1.isOk()).toBe(true);

      const result2 = await organizationService.createOrganization(command2);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('SLUG_ALREADY_EXISTS');
        if (result2.error.code === 'SLUG_ALREADY_EXISTS') {
          expect(result2.error.slug).toBe('duplicate-slug');
        }
      }
    });
  });

  describe('getOrganizationById', () => {
    it('should retrieve an organization by id', async () => {
      const createResult = await organizationService.createOrganization({
        name: 'Get Test Org',
        slug: 'get-test-org',
        createdByUserId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(createResult.isOk()).toBe(true);
      if (createResult.isOk()) {
        const orgId = createResult.value.id;

        const getResult = await organizationService.getOrganizationById(orgId);

        expect(getResult.isOk()).toBe(true);
        if (getResult.isOk()) {
          expect(getResult.value.id).toBe(orgId);
          expect(getResult.value.name).toBe('Get Test Org');
          expect(getResult.value.slug).toBe('get-test-org');
        }
      }
    });

    it('should return error for non-existent organization', async () => {
      const result = await organizationService.getOrganizationById(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('ORGANIZATION_NOT_FOUND');
      }
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should retrieve an organization by slug', async () => {
      await organizationService.createOrganization({
        name: 'Slug Test Org',
        slug: 'slug-test-org',
        createdByUserId: '550e8400-e29b-41d4-a716-446655440000',
      });

      const result =
        await organizationService.getOrganizationBySlug('slug-test-org');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.slug).toBe('slug-test-org');
        expect(result.value.name).toBe('Slug Test Org');
      }
    });

    it('should return error for non-existent slug', async () => {
      const result =
        await organizationService.getOrganizationBySlug('non-existent');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('ORGANIZATION_NOT_FOUND');
      }
    });
  });

  describe('listUserOrganizations', () => {
    it('should list all organizations for a user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';

      // Create multiple organizations
      await organizationService.createOrganization({
        name: 'Org 1',
        slug: 'org-1',
        createdByUserId: userId,
      });

      await organizationService.createOrganization({
        name: 'Org 2',
        slug: 'org-2',
        createdByUserId: userId,
      });

      const result = await organizationService.listUserOrganizations(userId);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.name).toBe('Org 1');
        expect(result.value[1]?.name).toBe('Org 2');
      }
    });

    it('should return empty array for user with no organizations', async () => {
      const result = await organizationService.listUserOrganizations(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it('should include organizations where user is a member', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const memberId = '550e8400-e29b-41d4-a716-446655440001';

      // Owner creates org
      const orgResult = await organizationService.createOrganization({
        name: 'Shared Org',
        slug: 'shared-org',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add member
        await organizationService.addMember({
          organizationId: orgId,
          userId: memberId,
          role: 'member',
        });

        // Member should see the org
        const memberOrgs =
          await organizationService.listUserOrganizations(memberId);
        expect(memberOrgs.isOk()).toBe(true);
        if (memberOrgs.isOk()) {
          expect(memberOrgs.value).toHaveLength(1);
          expect(memberOrgs.value[0]?.id).toBe(orgId);
        }
      }
    });
  });

  describe('addMember', () => {
    it('should add a member to an organization', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const newMemberId = '550e8400-e29b-41d4-a716-446655440001';

      const orgResult = await organizationService.createOrganization({
        name: 'Member Test Org',
        slug: 'member-test-org',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        const command: AddMemberCommand = {
          organizationId: orgId,
          userId: newMemberId,
          role: 'member',
        };

        const result = await organizationService.addMember(command);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.userId).toBe(newMemberId);
          expect(result.value.organizationId).toBe(orgId);
          expect(result.value.role).toBe('member');
          expect(result.value.id).toBeDefined();
        }
      }
    });

    it('should reject adding member to non-existent organization', async () => {
      const command: AddMemberCommand = {
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        role: 'member',
      };

      const result = await organizationService.addMember(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('ORGANIZATION_NOT_FOUND');
      }
    });

    it('should reject adding user who is already a member', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const memberId = '550e8400-e29b-41d4-a716-446655440001';

      const orgResult = await organizationService.createOrganization({
        name: 'Duplicate Member Test',
        slug: 'duplicate-member-test',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add member first time
        const result1 = await organizationService.addMember({
          organizationId: orgId,
          userId: memberId,
          role: 'member',
        });
        expect(result1.isOk()).toBe(true);

        // Try to add same user again
        const result2 = await organizationService.addMember({
          organizationId: orgId,
          userId: memberId,
          role: 'admin',
        });

        expect(result2.isErr()).toBe(true);
        if (result2.isErr()) {
          expect(result2.error.code).toBe('USER_ALREADY_MEMBER');
        }
      }
    });
  });

  describe('removeMember', () => {
    it('should remove a member from organization', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const memberId = '550e8400-e29b-41d4-a716-446655440001';

      const orgResult = await organizationService.createOrganization({
        name: 'Remove Test Org',
        slug: 'remove-test-org',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add member
        const addResult = await organizationService.addMember({
          organizationId: orgId,
          userId: memberId,
          role: 'member',
        });

        expect(addResult.isOk()).toBe(true);
        if (addResult.isOk()) {
          const membershipId = addResult.value.id;

          // Remove member
          const removeResult =
            await organizationService.removeMember(membershipId);

          expect(removeResult.isOk()).toBe(true);

          // Verify member was removed
          const membership = await membershipStore.findById(membershipId);
          expect(membership).toBeNull();
        }
      }
    });

    it('should reject removing non-existent membership', async () => {
      const result = await organizationService.removeMember(
        '550e8400-e29b-41d4-a716-446655440000',
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MEMBERSHIP_NOT_FOUND');
      }
    });

    it('should reject removing the last owner', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';

      const orgResult = await organizationService.createOrganization({
        name: 'Last Owner Test',
        slug: 'last-owner-test',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Find owner membership
        const ownerMembership = await membershipStore.findByUserAndOrg({
          userId: ownerId,
          organizationId: orgId,
        });

        expect(ownerMembership).toBeDefined();
        if (ownerMembership) {
          const result = await organizationService.removeMember(
            ownerMembership.id,
          );

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.code).toBe('CANNOT_REMOVE_LAST_OWNER');
          }
        }
      }
    });

    it('should allow removing an owner when another owner exists', async () => {
      const owner1Id = '550e8400-e29b-41d4-a716-446655440000';
      const owner2Id = '550e8400-e29b-41d4-a716-446655440001';

      const orgResult = await organizationService.createOrganization({
        name: 'Multiple Owners Test',
        slug: 'multiple-owners-test',
        createdByUserId: owner1Id,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add second owner
        const addOwnerResult = await organizationService.addMember({
          organizationId: orgId,
          userId: owner2Id,
          role: 'owner',
        });

        expect(addOwnerResult.isOk()).toBe(true);

        // Find first owner membership
        const owner1Membership = await membershipStore.findByUserAndOrg({
          userId: owner1Id,
          organizationId: orgId,
        });

        expect(owner1Membership).toBeDefined();
        if (owner1Membership) {
          // Remove first owner should succeed
          const result = await organizationService.removeMember(
            owner1Membership.id,
          );
          expect(result.isOk()).toBe(true);
        }
      }
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const memberId = '550e8400-e29b-41d4-a716-446655440001';

      const orgResult = await organizationService.createOrganization({
        name: 'Update Role Test',
        slug: 'update-role-test',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add member
        const addResult = await organizationService.addMember({
          organizationId: orgId,
          userId: memberId,
          role: 'member',
        });

        expect(addResult.isOk()).toBe(true);
        if (addResult.isOk()) {
          const membershipId = addResult.value.id;

          // Update to admin
          const command: UpdateMemberRoleCommand = {
            membershipId,
            newRole: 'admin',
          };

          const updateResult =
            await organizationService.updateMemberRole(command);

          expect(updateResult.isOk()).toBe(true);
          if (updateResult.isOk()) {
            expect(updateResult.value.role).toBe('admin');
            expect(updateResult.value.id).toBe(membershipId);
          }
        }
      }
    });

    it('should reject updating non-existent membership', async () => {
      const command: UpdateMemberRoleCommand = {
        membershipId: '550e8400-e29b-41d4-a716-446655440000',
        newRole: 'admin',
      };

      const result = await organizationService.updateMemberRole(command);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MEMBERSHIP_NOT_FOUND');
      }
    });

    it('should reject downgrading the last owner', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';

      const orgResult = await organizationService.createOrganization({
        name: 'Downgrade Last Owner Test',
        slug: 'downgrade-last-owner-test',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Find owner membership
        const ownerMembership = await membershipStore.findByUserAndOrg({
          userId: ownerId,
          organizationId: orgId,
        });

        expect(ownerMembership).toBeDefined();
        if (ownerMembership) {
          const command: UpdateMemberRoleCommand = {
            membershipId: ownerMembership.id,
            newRole: 'admin',
          };

          const result = await organizationService.updateMemberRole(command);

          expect(result.isErr()).toBe(true);
          if (result.isErr()) {
            expect(result.error.code).toBe('CANNOT_CHANGE_LAST_OWNER');
          }
        }
      }
    });

    it('should allow downgrading an owner when another owner exists', async () => {
      const owner1Id = '550e8400-e29b-41d4-a716-446655440000';
      const owner2Id = '550e8400-e29b-41d4-a716-446655440001';

      const orgResult = await organizationService.createOrganization({
        name: 'Downgrade Owner Test',
        slug: 'downgrade-owner-test',
        createdByUserId: owner1Id,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add second owner
        await organizationService.addMember({
          organizationId: orgId,
          userId: owner2Id,
          role: 'owner',
        });

        // Find first owner membership
        const owner1Membership = await membershipStore.findByUserAndOrg({
          userId: owner1Id,
          organizationId: orgId,
        });

        expect(owner1Membership).toBeDefined();
        if (owner1Membership) {
          const command: UpdateMemberRoleCommand = {
            membershipId: owner1Membership.id,
            newRole: 'admin',
          };

          const result = await organizationService.updateMemberRole(command);
          expect(result.isOk()).toBe(true);
          if (result.isOk()) {
            expect(result.value.role).toBe('admin');
          }
        }
      }
    });
  });

  describe('listMembers', () => {
    it('should list all members of an organization', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';
      const member1Id = '550e8400-e29b-41d4-a716-446655440001';
      const member2Id = '550e8400-e29b-41d4-a716-446655440002';

      const orgResult = await organizationService.createOrganization({
        name: 'List Members Test',
        slug: 'list-members-test',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        // Add members
        await organizationService.addMember({
          organizationId: orgId,
          userId: member1Id,
          role: 'admin',
        });
        await organizationService.addMember({
          organizationId: orgId,
          userId: member2Id,
          role: 'member',
        });

        const result = await organizationService.listMembers(orgId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          // Should have 3 members: owner + 2 added
          expect(result.value).toHaveLength(3);

          const roles = result.value.map((m) => m.role);
          expect(roles).toContain('owner');
          expect(roles).toContain('admin');
          expect(roles).toContain('member');
        }
      }
    });

    it('should return only owner for new organization', async () => {
      const ownerId = '550e8400-e29b-41d4-a716-446655440000';

      const orgResult = await organizationService.createOrganization({
        name: 'Single Member Test',
        slug: 'single-member-test',
        createdByUserId: ownerId,
      });

      expect(orgResult.isOk()).toBe(true);
      if (orgResult.isOk()) {
        const orgId = orgResult.value.id;

        const result = await organizationService.listMembers(orgId);

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toHaveLength(1);
          expect(result.value[0]?.role).toBe('owner');
          expect(result.value[0]?.userId).toBe(ownerId);
        }
      }
    });
  });
});
