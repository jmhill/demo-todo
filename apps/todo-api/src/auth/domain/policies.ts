import { ok, err, type Result } from 'neverthrow';
import type {
  Permission,
  AuthorizationError,
  OrgContext,
} from './authorization-schemas.js';

/**
 * Policy function signature
 * Takes org context and optional resource context
 * Returns Result<void, AuthorizationError>
 */
export type Policy = (
  orgContext: OrgContext,
  resourceContext?: { createdBy?: string; [key: string]: unknown },
) => Result<void, AuthorizationError>;

/**
 * Requires user to have specific permission
 */
export const requirePermission = (permission: Permission): Policy => {
  return (orgContext) => {
    if (orgContext.permissions.includes(permission)) {
      return ok(undefined);
    }

    return err({
      code: 'MISSING_PERMISSION',
      required: permission,
      available: orgContext.permissions,
    });
  };
};

/**
 * Requires ANY of the given permissions (OR logic)
 */
export const requireAnyPermission = (
  ...permissions: [Permission, ...Permission[]]
): Policy => {
  return (orgContext) => {
    const hasAny = permissions.some((p) => orgContext.permissions.includes(p));

    if (hasAny) {
      return ok(undefined);
    }

    return err({
      code: 'MISSING_PERMISSION',
      required: permissions[0],
      available: orgContext.permissions,
    });
  };
};

/**
 * Requires ALL of the given permissions (AND logic)
 */
export const requireAllPermissions = (
  ...permissions: [Permission, ...Permission[]]
): Policy => {
  return (orgContext) => {
    for (const permission of permissions) {
      if (!orgContext.permissions.includes(permission)) {
        return err({
          code: 'MISSING_PERMISSION',
          required: permission,
          available: orgContext.permissions,
        });
      }
    }
    return ok(undefined);
  };
};

/**
 * Requires user to be the creator OR have permission
 * Common pattern for resource-specific authorization
 */
export const requireCreatorOrPermission = (permission: Permission): Policy => {
  return (orgContext, resourceContext) => {
    // Check if user is creator
    if (resourceContext?.createdBy === orgContext.membership.userId) {
      return ok(undefined);
    }

    // Otherwise, check permission
    return requirePermission(permission)(orgContext, resourceContext);
  };
};

/**
 * Custom policy with user-defined logic
 */
export const custom = (
  evaluator: (orgContext: OrgContext, resourceContext?: unknown) => boolean,
  errorMessage: string,
): Policy => {
  return (orgContext, resourceContext) => {
    if (evaluator(orgContext, resourceContext)) {
      return ok(undefined);
    }
    return err({
      code: 'FORBIDDEN',
      message: errorMessage,
    });
  };
};
