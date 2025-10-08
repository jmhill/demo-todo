import type { OrganizationMembership } from '../domain/organization-schemas.js';
import type { OrganizationMembershipStore } from '../domain/organization-service.js';

export function createInMemoryMembershipStore(): OrganizationMembershipStore {
  const memberships = new Map<string, OrganizationMembership>();
  const userOrgIndex = new Map<string, string>(); // "userId:orgId" -> membershipId
  const orgIndex = new Map<string, Set<string>>(); // orgId -> Set<membershipId>
  const userIndex = new Map<string, Set<string>>(); // userId -> Set<membershipId>

  return {
    async save(membership: OrganizationMembership): Promise<void> {
      memberships.set(membership.id, membership);

      // Update user-org composite index
      const key = `${membership.userId}:${membership.organizationId}`;
      userOrgIndex.set(key, membership.id);

      // Update org index
      if (!orgIndex.has(membership.organizationId)) {
        orgIndex.set(membership.organizationId, new Set());
      }
      orgIndex.get(membership.organizationId)?.add(membership.id);

      // Update user index
      if (!userIndex.has(membership.userId)) {
        userIndex.set(membership.userId, new Set());
      }
      userIndex.get(membership.userId)?.add(membership.id);
    },

    async findById(id: string): Promise<OrganizationMembership | null> {
      return memberships.get(id) ?? null;
    },

    async findByUserAndOrg(options: {
      userId: string;
      organizationId: string;
    }): Promise<OrganizationMembership | null> {
      const key = `${options.userId}:${options.organizationId}`;
      const id = userOrgIndex.get(key);
      if (!id) return null;
      return memberships.get(id) ?? null;
    },

    async findByOrganizationId(
      orgId: string,
    ): Promise<OrganizationMembership[]> {
      const membershipIds = orgIndex.get(orgId);
      if (!membershipIds) return [];

      const result: OrganizationMembership[] = [];
      for (const id of membershipIds) {
        const membership = memberships.get(id);
        if (membership) {
          result.push(membership);
        }
      }
      return result;
    },

    async findByUserId(userId: string): Promise<OrganizationMembership[]> {
      const membershipIds = userIndex.get(userId);
      if (!membershipIds) return [];

      const result: OrganizationMembership[] = [];
      for (const id of membershipIds) {
        const membership = memberships.get(id);
        if (membership) {
          result.push(membership);
        }
      }
      return result;
    },

    async update(membership: OrganizationMembership): Promise<void> {
      memberships.set(membership.id, membership);
    },

    async delete(membershipId: string): Promise<void> {
      const membership = memberships.get(membershipId);
      if (!membership) return;

      // Remove from main map
      memberships.delete(membershipId);

      // Remove from user-org index
      const key = `${membership.userId}:${membership.organizationId}`;
      userOrgIndex.delete(key);

      // Remove from org index
      orgIndex.get(membership.organizationId)?.delete(membershipId);

      // Remove from user index
      userIndex.get(membership.userId)?.delete(membershipId);
    },
  };
}
