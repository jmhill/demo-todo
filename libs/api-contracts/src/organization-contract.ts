import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  CreateOrganizationRequestSchema,
  OrganizationResponseSchema,
  OrganizationWithMembershipResponseSchema,
  AddMemberRequestSchema,
  UpdateMemberRoleRequestSchema,
  MembershipResponseSchema,
} from './organization-schemas.js';

const c = initContract();

export const organizationContract = c.router(
  {
    createOrganization: {
      method: 'POST',
      path: '/organizations',
      body: CreateOrganizationRequestSchema,
      responses: {
        201: OrganizationResponseSchema,
        400: z.object({
          message: z.string(),
          code: z.literal('VALIDATION_ERROR'),
        }),
        409: z.object({
          message: z.string(),
          code: z.literal('SLUG_ALREADY_EXISTS'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'Create a new organization',
      strictStatusCodes: true,
    },

    getOrganizationById: {
      method: 'GET',
      path: '/organizations/:id',
      responses: {
        200: OrganizationResponseSchema,
        404: z.object({
          message: z.string(),
          code: z.literal('ORGANIZATION_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'Get organization by ID',
      strictStatusCodes: true,
    },

    listUserOrganizations: {
      method: 'GET',
      path: '/organizations',
      responses: {
        200: z.array(OrganizationWithMembershipResponseSchema),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary:
        'List all organizations the current user belongs to with membership info',
      strictStatusCodes: true,
    },

    listMembers: {
      method: 'GET',
      path: '/organizations/:orgId/members',
      responses: {
        200: z.array(MembershipResponseSchema),
        404: z.object({
          message: z.string(),
          code: z.literal('ORGANIZATION_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'List all members of an organization',
      strictStatusCodes: true,
    },

    addMember: {
      method: 'POST',
      path: '/organizations/:orgId/members',
      body: AddMemberRequestSchema,
      responses: {
        201: MembershipResponseSchema,
        404: z.object({
          message: z.string(),
          code: z.literal('ORGANIZATION_NOT_FOUND'),
        }),
        409: z.object({
          message: z.string(),
          code: z.literal('USER_ALREADY_MEMBER'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'Add a member to an organization',
      strictStatusCodes: true,
    },

    updateMemberRole: {
      method: 'PATCH',
      path: '/organizations/:orgId/members/:membershipId',
      body: UpdateMemberRoleRequestSchema,
      responses: {
        200: MembershipResponseSchema,
        400: z.object({
          message: z.string(),
          code: z.literal('CANNOT_CHANGE_LAST_OWNER'),
        }),
        404: z.object({
          message: z.string(),
          code: z.literal('MEMBERSHIP_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: "Update a member's role",
      strictStatusCodes: true,
    },

    removeMember: {
      method: 'DELETE',
      path: '/organizations/:orgId/members/:membershipId',
      responses: {
        204: z.void(),
        400: z.object({
          message: z.string(),
          code: z.literal('CANNOT_REMOVE_LAST_OWNER'),
        }),
        404: z.object({
          message: z.string(),
          code: z.literal('MEMBERSHIP_NOT_FOUND'),
        }),
        500: z.object({
          message: z.string(),
          code: z.literal('UNEXPECTED_ERROR'),
        }),
      },
      summary: 'Remove a member from an organization',
      strictStatusCodes: true,
    },
  },
  {
    strictStatusCodes: true,
  },
);
