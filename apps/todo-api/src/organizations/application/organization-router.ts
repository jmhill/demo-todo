import { initServer } from '@ts-rest/express';
import {
  organizationContract,
  type OrganizationResponse,
  type MembershipResponse,
} from '@demo-todo/api-contracts';
import type { OrganizationService } from '../domain/organization-service.js';
import type {
  Organization,
  OrganizationMembership,
} from '../domain/organization-schemas.js';
import type { Request } from 'express';

const s = initServer();

// Helper to convert domain Organization to API response
const toOrganizationResponse = (org: Organization): OrganizationResponse => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  createdAt: org.createdAt.toISOString(),
  updatedAt: org.updatedAt.toISOString(),
});

// Helper to convert domain Membership to API response
const toMembershipResponse = (
  membership: OrganizationMembership,
): MembershipResponse => ({
  id: membership.id,
  userId: membership.userId,
  organizationId: membership.organizationId,
  role: membership.role,
  createdAt: membership.createdAt.toISOString(),
  updatedAt: membership.updatedAt.toISOString(),
});

// Extract authenticated user from request
// Auth middleware ensures req.auth is always set for protected routes
const extractAuthUser = (req: Request): { id: string } => {
  return { id: req.auth!.user.id };
};

// Factory to create organization router with dependencies
export const createOrganizationRouter = (
  organizationService: OrganizationService,
) => {
  return s.router(organizationContract, {
    createOrganization: async ({ body, req }) => {
      const user = extractAuthUser(req);

      // Validate slug format (only lowercase letters, numbers, and hyphens)
      if (!/^[a-z0-9-]+$/.test(body.slug)) {
        return {
          status: 400,
          body: {
            message:
              'Slug must contain only lowercase letters, numbers, and hyphens',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      // Call service
      const result = await organizationService.createOrganization({
        name: body.name,
        slug: body.slug,
        createdByUserId: user.id,
      });

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'SLUG_ALREADY_EXISTS':
            return {
              status: 409,
              body: {
                message: `Slug '${error.slug}' is already in use`,
                code: 'SLUG_ALREADY_EXISTS',
              },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 201,
        body: toOrganizationResponse(result.value),
      };
    },

    getOrganizationById: async ({ params }) => {
      const result = await organizationService.getOrganizationById(params.id);

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'ORGANIZATION_NOT_FOUND':
            return {
              status: 404,
              body: {
                message: 'Organization not found',
                code: 'ORGANIZATION_NOT_FOUND',
              },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 200,
        body: toOrganizationResponse(result.value),
      };
    },

    listUserOrganizations: async ({ req }) => {
      const user = extractAuthUser(req);

      const result = await organizationService.listUserOrganizations(user.id);

      if (result.isErr()) {
        return {
          status: 500,
          body: {
            message: 'Internal server error',
            code: 'UNEXPECTED_ERROR',
          },
        };
      }

      return {
        status: 200,
        body: result.value.map(toOrganizationResponse),
      };
    },

    listMembers: async ({ params }) => {
      // First check if organization exists
      const orgResult = await organizationService.getOrganizationById(
        params.orgId,
      );

      if (orgResult.isErr()) {
        const error = orgResult.error;
        if (error.code === 'ORGANIZATION_NOT_FOUND') {
          return {
            status: 404,
            body: {
              message: 'Organization not found',
              code: 'ORGANIZATION_NOT_FOUND',
            },
          };
        }
        return {
          status: 500,
          body: {
            message: 'Internal server error',
            code: 'UNEXPECTED_ERROR',
          },
        };
      }

      // Now list members
      const result = await organizationService.listMembers(params.orgId);

      if (result.isErr()) {
        return {
          status: 500,
          body: {
            message: 'Internal server error',
            code: 'UNEXPECTED_ERROR',
          },
        };
      }

      return {
        status: 200,
        body: result.value.map(toMembershipResponse),
      };
    },

    addMember: async ({ params, body }) => {
      const result = await organizationService.addMember({
        organizationId: params.orgId,
        userId: body.userId,
        role: body.role,
      });

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'ORGANIZATION_NOT_FOUND':
            return {
              status: 404,
              body: {
                message: 'Organization not found',
                code: 'ORGANIZATION_NOT_FOUND',
              },
            };
          case 'USER_ALREADY_MEMBER':
            return {
              status: 409,
              body: {
                message: 'User is already a member of this organization',
                code: 'USER_ALREADY_MEMBER',
              },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 201,
        body: toMembershipResponse(result.value),
      };
    },

    updateMemberRole: async ({ params, body }) => {
      const result = await organizationService.updateMemberRole({
        membershipId: params.membershipId,
        newRole: body.role,
      });

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'MEMBERSHIP_NOT_FOUND':
            return {
              status: 404,
              body: {
                message: 'Membership not found',
                code: 'MEMBERSHIP_NOT_FOUND',
              },
            };
          case 'CANNOT_CHANGE_LAST_OWNER':
            return {
              status: 400,
              body: {
                message: 'Cannot change the role of the last owner',
                code: 'CANNOT_CHANGE_LAST_OWNER',
              },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 200,
        body: toMembershipResponse(result.value),
      };
    },

    removeMember: async ({ params }) => {
      const result = await organizationService.removeMember(
        params.membershipId,
      );

      if (result.isErr()) {
        const error = result.error;
        switch (error.code) {
          case 'MEMBERSHIP_NOT_FOUND':
            return {
              status: 404,
              body: {
                message: 'Membership not found',
                code: 'MEMBERSHIP_NOT_FOUND',
              },
            };
          case 'CANNOT_REMOVE_LAST_OWNER':
            return {
              status: 400,
              body: {
                message: 'Cannot remove the last owner',
                code: 'CANNOT_REMOVE_LAST_OWNER',
              },
            };
          case 'UNEXPECTED_ERROR':
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
        }
      }

      return {
        status: 204,
        body: undefined,
      };
    },
  });
};
