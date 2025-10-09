import { z } from 'zod';
import {
  OrganizationMembershipSchema,
  type OrganizationRole,
} from '../../organizations/domain/organization-schemas.js';

/**
 * Granular permissions - atomic units of authorization
 * These are the building blocks for roles
 */
export const PermissionSchema = z.enum([
  // Todo permissions
  'todos:create',
  'todos:read',
  'todos:update',
  'todos:delete',
  'todos:complete',

  // Organization permissions
  'org:members:read',
  'org:members:invite',
  'org:members:remove',
  'org:members:update-role',
  'org:settings:read',
  'org:settings:update',
  'org:delete',
]);

export type Permission = z.infer<typeof PermissionSchema>;

/**
 * Roles are bundles of permissions
 * Defined as constants, not hierarchy
 * Easy to add exceptions or customize per-org in future
 */
export const RoleDefinitions = {
  owner: [
    // Full access to everything
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
  ] as const satisfies readonly Permission[],

  admin: [
    // Can manage todos and members, but not delete org
    'todos:create',
    'todos:read',
    'todos:update',
    'todos:delete',
    'todos:complete',
    'org:members:read',
    'org:members:invite',
    'org:members:remove',
    'org:settings:read',
  ] as const satisfies readonly Permission[],

  member: [
    // Can create and manage own todos, view members
    'todos:create',
    'todos:read',
    'todos:update',
    'todos:complete',
    'org:members:read',
  ] as const satisfies readonly Permission[],

  viewer: [
    // Read-only access
    'todos:read',
    'org:members:read',
    'org:settings:read',
  ] as const satisfies readonly Permission[],
} as const;

/**
 * Helper to resolve permissions from role
 */
export const getPermissionsForRole = (
  role: OrganizationRole,
): readonly Permission[] => {
  return RoleDefinitions[role];
};

/**
 * Organization context attached to req.auth.orgContext
 * Contains resolved permissions for easy checking
 */
export const OrgContextSchema = z.object({
  organizationId: z.string().uuid(),
  membership: OrganizationMembershipSchema,
  permissions: z.array(PermissionSchema), // Resolved from role
});

export type OrgContext = z.infer<typeof OrgContextSchema>;

/**
 * Authorization errors
 */
export const AuthorizationErrorSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('NOT_MEMBER'),
    organizationId: z.string(),
  }),
  z.object({
    code: z.literal('MISSING_PERMISSION'),
    required: PermissionSchema,
    available: z.array(PermissionSchema),
  }),
  z.object({
    code: z.literal('FORBIDDEN'),
    message: z.string(),
  }),
]);

export type AuthorizationError = z.infer<typeof AuthorizationErrorSchema>;
