// Operation-specific error types

export type CreateOrganizationError =
  | { code: 'SLUG_ALREADY_EXISTS'; slug: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type GetOrganizationError =
  | { code: 'ORGANIZATION_NOT_FOUND'; identifier: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type AddMemberError =
  | { code: 'ORGANIZATION_NOT_FOUND'; organizationId: string }
  | { code: 'USER_ALREADY_MEMBER'; userId: string; organizationId: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type RemoveMemberError =
  | { code: 'MEMBERSHIP_NOT_FOUND'; membershipId: string }
  | { code: 'CANNOT_REMOVE_LAST_OWNER'; organizationId: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type UpdateMemberRoleError =
  | { code: 'MEMBERSHIP_NOT_FOUND'; membershipId: string }
  | { code: 'CANNOT_CHANGE_LAST_OWNER'; organizationId: string }
  | { code: 'UNEXPECTED_ERROR'; message: string; cause?: unknown };

export type ListOrganizationsError = {
  code: 'UNEXPECTED_ERROR';
  message: string;
  cause?: unknown;
};
