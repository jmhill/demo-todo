import { z } from 'zod';

/**
 * Organization Schema
 * Represents a workspace/tenant that contains todos and has members
 */
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

/**
 * Command for creating a new organization
 */
export const CreateOrganizationCommandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdByUserId: z.string().uuid(),
});

export type CreateOrganizationCommand = z.infer<
  typeof CreateOrganizationCommandSchema
>;

/**
 * Organization Roles
 * - owner: Full control including deleting the organization
 * - admin: Can manage members and all resources
 * - member: Can create and manage own resources
 * - viewer: Read-only access
 */
export const OrganizationRoleSchema = z.enum([
  'owner',
  'admin',
  'member',
  'viewer',
]);

export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

/**
 * Organization Membership Schema
 * Links a user to an organization with a specific role
 */
export const OrganizationMembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: OrganizationRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type OrganizationMembership = z.infer<
  typeof OrganizationMembershipSchema
>;

/**
 * Command for adding a member to an organization
 */
export const AddMemberCommandSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: OrganizationRoleSchema,
});

export type AddMemberCommand = z.infer<typeof AddMemberCommandSchema>;

/**
 * Command for updating a member's role
 */
export const UpdateMemberRoleCommandSchema = z.object({
  membershipId: z.string().uuid(),
  newRole: OrganizationRoleSchema,
});

export type UpdateMemberRoleCommand = z.infer<
  typeof UpdateMemberRoleCommandSchema
>;
