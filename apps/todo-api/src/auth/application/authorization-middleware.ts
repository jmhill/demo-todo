import type { Request, Response, NextFunction } from 'express';
import type { Permission } from '../domain/authorization-schemas.js';
import { requirePermission, requireAnyPermission } from '../domain/policies.js';
import { extractOrgContext } from '../domain/auth-types.js';

/**
 * Middleware factory: Check if user has required permission(s)
 * Use declaratively on most endpoints via ts-rest's per-endpoint middleware
 *
 * Usage:
 *   createTodo: {
 *     middleware: [requirePermissions('todos:create')],
 *     handler: async ({ body, req }) => { ... }
 *   }
 */
export const requirePermissions = (
  ...permissions: [Permission, ...Permission[]]
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract org context (attached by requireOrgMembership)
    const contextResult = extractOrgContext(req);

    if (contextResult.isErr()) {
      res.status(401).json({
        message: contextResult.error.message,
        code: 'MISSING_AUTH',
      });
      return;
    }

    const orgContext = contextResult.value;

    // Check permissions using policy
    const policy =
      permissions.length === 1
        ? requirePermission(permissions[0])
        : requireAnyPermission(permissions[0], ...permissions.slice(1));

    const authResult = policy(orgContext);

    if (authResult.isErr()) {
      const error = authResult.error;

      if (error.code === 'MISSING_PERMISSION') {
        res.status(403).json({
          message: `Missing required permission: ${error.required}`,
          code: 'MISSING_PERMISSION',
        });
        return;
      }

      res.status(403).json({
        message: 'Forbidden',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
};
