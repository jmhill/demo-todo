import { ResultAsync, errAsync, okAsync } from 'neverthrow';
import type { Clock, IdGenerator } from '@demo-todo/infrastructure';
import type {
  Organization,
  OrganizationMembership,
  CreateOrganizationCommand,
  AddMemberCommand,
  UpdateMemberRoleCommand,
} from './organization-schemas.js';
import type {
  CreateOrganizationError,
  GetOrganizationError,
  AddMemberError,
  RemoveMemberError,
  UpdateMemberRoleError,
  ListOrganizationsError,
} from './organization-errors.js';

// Domain-owned ports - infrastructure implements these

export interface OrganizationStore {
  save(org: Organization): Promise<void>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  update(org: Organization): Promise<void>;
}

export interface OrganizationMembershipStore {
  save(membership: OrganizationMembership): Promise<void>;
  findById(id: string): Promise<OrganizationMembership | null>;
  findByUserAndOrg(options: {
    userId: string;
    organizationId: string;
  }): Promise<OrganizationMembership | null>;
  findByOrganizationId(orgId: string): Promise<OrganizationMembership[]>;
  findByUserId(userId: string): Promise<OrganizationMembership[]>;
  update(membership: OrganizationMembership): Promise<void>;
  delete(membershipId: string): Promise<void>;
}

export interface OrganizationService {
  createOrganization(
    command: CreateOrganizationCommand,
  ): ResultAsync<Organization, CreateOrganizationError>;

  getOrganizationById(
    id: string,
  ): ResultAsync<Organization, GetOrganizationError>;

  getOrganizationBySlug(
    slug: string,
  ): ResultAsync<Organization, GetOrganizationError>;

  listUserOrganizations(
    userId: string,
  ): ResultAsync<Organization[], ListOrganizationsError>;

  addMember(
    command: AddMemberCommand,
  ): ResultAsync<OrganizationMembership, AddMemberError>;

  removeMember(membershipId: string): ResultAsync<void, RemoveMemberError>;

  updateMemberRole(
    command: UpdateMemberRoleCommand,
  ): ResultAsync<OrganizationMembership, UpdateMemberRoleError>;

  listMembers(
    organizationId: string,
  ): ResultAsync<OrganizationMembership[], ListOrganizationsError>;
}

export function createOrganizationService(
  orgStore: OrganizationStore,
  membershipStore: OrganizationMembershipStore,
  idGenerator: IdGenerator,
  clock: Clock,
): OrganizationService {
  return {
    createOrganization(
      command: CreateOrganizationCommand,
    ): ResultAsync<Organization, CreateOrganizationError> {
      const now = clock.now();
      const orgId = idGenerator.generate();
      const membershipId = idGenerator.generate();

      const organization: Organization = {
        id: orgId,
        name: command.name,
        slug: command.slug,
        createdAt: now,
        updatedAt: now,
      };

      // Check if slug already exists
      return ResultAsync.fromPromise(
        orgStore.findBySlug(command.slug),
        (error): CreateOrganizationError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error checking slug',
          cause: error,
        }),
      )
        .andThen((existing) => {
          if (existing) {
            return errAsync({
              code: 'SLUG_ALREADY_EXISTS',
              slug: command.slug,
            } as const);
          }
          return okAsync(null);
        })
        .andThen(() =>
          // Save organization
          ResultAsync.fromPromise(
            orgStore.save(organization),
            (error): CreateOrganizationError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error saving organization',
              cause: error,
            }),
          ),
        )
        .andThen(() => {
          // Create owner membership for creator
          const membership: OrganizationMembership = {
            id: membershipId,
            userId: command.createdByUserId,
            organizationId: orgId,
            role: 'owner',
            createdAt: now,
            updatedAt: now,
          };

          return ResultAsync.fromPromise(
            membershipStore.save(membership),
            (error): CreateOrganizationError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error creating membership',
              cause: error,
            }),
          );
        })
        .map(() => organization);
    },

    getOrganizationById(
      id: string,
    ): ResultAsync<Organization, GetOrganizationError> {
      return ResultAsync.fromPromise(
        orgStore.findById(id),
        (error): GetOrganizationError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching organization',
          cause: error,
        }),
      ).andThen((org) => {
        if (!org) {
          return errAsync({
            code: 'ORGANIZATION_NOT_FOUND',
            identifier: id,
          } as const);
        }
        return okAsync(org);
      });
    },

    getOrganizationBySlug(
      slug: string,
    ): ResultAsync<Organization, GetOrganizationError> {
      return ResultAsync.fromPromise(
        orgStore.findBySlug(slug),
        (error): GetOrganizationError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching organization',
          cause: error,
        }),
      ).andThen((org) => {
        if (!org) {
          return errAsync({
            code: 'ORGANIZATION_NOT_FOUND',
            identifier: slug,
          } as const);
        }
        return okAsync(org);
      });
    },

    listUserOrganizations(
      userId: string,
    ): ResultAsync<Organization[], ListOrganizationsError> {
      return ResultAsync.fromPromise(
        membershipStore.findByUserId(userId),
        (error): ListOrganizationsError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching memberships',
          cause: error,
        }),
      ).andThen((memberships) => {
        // Fetch all organizations for these memberships
        const orgPromises = memberships.map((m) =>
          orgStore.findById(m.organizationId),
        );

        return ResultAsync.fromPromise(
          Promise.all(orgPromises),
          (error): ListOrganizationsError => ({
            code: 'UNEXPECTED_ERROR',
            message: 'Database error fetching organizations',
            cause: error,
          }),
        ).map((orgs) =>
          orgs.filter((org): org is Organization => org !== null),
        );
      });
    },

    addMember(
      command: AddMemberCommand,
    ): ResultAsync<OrganizationMembership, AddMemberError> {
      // Check if organization exists
      return ResultAsync.fromPromise(
        orgStore.findById(command.organizationId),
        (error): AddMemberError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error checking organization',
          cause: error,
        }),
      )
        .andThen((org) => {
          if (!org) {
            return errAsync({
              code: 'ORGANIZATION_NOT_FOUND',
              organizationId: command.organizationId,
            } as const);
          }
          return okAsync(org);
        })
        .andThen(() =>
          // Check if user is already a member
          ResultAsync.fromPromise(
            membershipStore.findByUserAndOrg({
              userId: command.userId,
              organizationId: command.organizationId,
            }),
            (error): AddMemberError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error checking membership',
              cause: error,
            }),
          ),
        )
        .andThen((existing) => {
          if (existing) {
            return errAsync({
              code: 'USER_ALREADY_MEMBER',
              userId: command.userId,
              organizationId: command.organizationId,
            } as const);
          }

          const now = clock.now();
          const membership: OrganizationMembership = {
            id: idGenerator.generate(),
            userId: command.userId,
            organizationId: command.organizationId,
            role: command.role,
            createdAt: now,
            updatedAt: now,
          };

          return ResultAsync.fromPromise(
            membershipStore.save(membership),
            (error): AddMemberError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error saving membership',
              cause: error,
            }),
          ).map(() => membership);
        });
    },

    removeMember(membershipId: string): ResultAsync<void, RemoveMemberError> {
      return ResultAsync.fromPromise(
        membershipStore.findById(membershipId),
        (error): RemoveMemberError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching membership',
          cause: error,
        }),
      )
        .andThen((membership) => {
          if (!membership) {
            return errAsync({
              code: 'MEMBERSHIP_NOT_FOUND',
              membershipId,
            } as const);
          }
          return okAsync(membership);
        })
        .andThen((membership) =>
          // Check if this is the last owner
          ResultAsync.fromPromise(
            membershipStore.findByOrganizationId(membership.organizationId),
            (error): RemoveMemberError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error checking owners',
              cause: error,
            }),
          ).andThen((allMembers) => {
            const owners = allMembers.filter((m) => m.role === 'owner');
            if (membership.role === 'owner' && owners.length === 1) {
              return errAsync({
                code: 'CANNOT_REMOVE_LAST_OWNER',
                organizationId: membership.organizationId,
              } as const);
            }
            return okAsync(membership);
          }),
        )
        .andThen((membership) =>
          ResultAsync.fromPromise(
            membershipStore.delete(membership.id),
            (error): RemoveMemberError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error deleting membership',
              cause: error,
            }),
          ),
        );
    },

    updateMemberRole(
      command: UpdateMemberRoleCommand,
    ): ResultAsync<OrganizationMembership, UpdateMemberRoleError> {
      return ResultAsync.fromPromise(
        membershipStore.findById(command.membershipId),
        (error): UpdateMemberRoleError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching membership',
          cause: error,
        }),
      )
        .andThen((membership) => {
          if (!membership) {
            return errAsync({
              code: 'MEMBERSHIP_NOT_FOUND',
              membershipId: command.membershipId,
            } as const);
          }
          return okAsync(membership);
        })
        .andThen((membership) => {
          // Check if downgrading the last owner
          if (membership.role === 'owner' && command.newRole !== 'owner') {
            return ResultAsync.fromPromise(
              membershipStore.findByOrganizationId(membership.organizationId),
              (error): UpdateMemberRoleError => ({
                code: 'UNEXPECTED_ERROR',
                message: 'Database error checking owners',
                cause: error,
              }),
            ).andThen((allMembers) => {
              const owners = allMembers.filter((m) => m.role === 'owner');
              if (owners.length === 1) {
                return errAsync({
                  code: 'CANNOT_CHANGE_LAST_OWNER',
                  organizationId: membership.organizationId,
                } as const);
              }
              return okAsync(membership);
            });
          }
          return okAsync(membership);
        })
        .andThen((membership) => {
          const now = clock.now();
          const updated: OrganizationMembership = {
            ...membership,
            role: command.newRole,
            updatedAt: now,
          };

          return ResultAsync.fromPromise(
            membershipStore.update(updated),
            (error): UpdateMemberRoleError => ({
              code: 'UNEXPECTED_ERROR',
              message: 'Database error updating membership',
              cause: error,
            }),
          ).map(() => updated);
        });
    },

    listMembers(
      organizationId: string,
    ): ResultAsync<OrganizationMembership[], ListOrganizationsError> {
      return ResultAsync.fromPromise(
        membershipStore.findByOrganizationId(organizationId),
        (error): ListOrganizationsError => ({
          code: 'UNEXPECTED_ERROR',
          message: 'Database error fetching members',
          cause: error,
        }),
      );
    },
  };
}
