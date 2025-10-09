import { z } from 'zod';

// Organization Role enum
export const OrganizationRoleSchema = z.enum([
  'owner',
  'admin',
  'member',
  'viewer',
]);

export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

// Request schemas

export const CreateOrganizationRequestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string(), // Validation happens in router for better error messages
});

export type CreateOrganizationRequest = z.infer<
  typeof CreateOrganizationRequestSchema
>;

export const AddMemberRequestSchema = z.object({
  userId: z.string().uuid(),
  role: OrganizationRoleSchema,
});

export type AddMemberRequest = z.infer<typeof AddMemberRequestSchema>;

export const UpdateMemberRoleRequestSchema = z.object({
  role: OrganizationRoleSchema,
});

export type UpdateMemberRoleRequest = z.infer<
  typeof UpdateMemberRoleRequestSchema
>;

// Response schemas - Dates transformed to ISO strings

export const OrganizationResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;

export const MembershipResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: OrganizationRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type MembershipResponse = z.infer<typeof MembershipResponseSchema>;

// Enhanced response schema with membership info for listUserOrganizations
export const OrganizationWithMembershipResponseSchema =
  OrganizationResponseSchema.extend({
    membership: z.object({
      id: z.string().uuid(),
      role: OrganizationRoleSchema,
    }),
  });

export type OrganizationWithMembershipResponse = z.infer<
  typeof OrganizationWithMembershipResponseSchema
>;
