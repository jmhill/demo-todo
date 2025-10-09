import type { Request, Response, NextFunction } from 'express';
import type { OrganizationMembershipStore } from '../../organizations/domain/organization-service.js';
import { getPermissionsForRole } from '../domain/authorization-schemas.js';
import { logOrgMembership, logger } from '../../observability/index.js';

/**
 * Middleware: Fetch org membership and attach to req.auth.orgContext
 * Runs BEFORE handlers for all organization-scoped routes
 *
 * Usage: Apply as globalMiddleware in createExpressEndpoints
 */
export const requireOrgMembership = (
  membershipStore: OrganizationMembershipStore,
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Auth middleware must have run first
    if (!req.auth) {
      res.status(401).json({
        message: 'Authentication required',
        code: 'MISSING_AUTH',
      });
      return;
    }

    const userId = req.auth.user.id;
    const orgId = req.params.orgId; // From route: /orgs/:orgId/...

    if (!orgId) {
      res.status(400).json({
        message: 'Organization ID required',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    try {
      // Fetch membership (single query)
      const membership = await membershipStore.findByUserAndOrg({
        userId,
        organizationId: orgId,
      });

      if (!membership) {
        logger.warn('Organization membership not found', {
          event: 'authz.membership.not_found',
          userId,
          organizationId: orgId,
        });

        res.status(403).json({
          message: 'Not a member of this organization',
          code: 'NOT_MEMBER',
        });
        return;
      }

      // Resolve permissions from role
      const permissions = getPermissionsForRole(membership.role);

      // Log successful membership resolution
      logOrgMembership({
        userId,
        organizationId: orgId,
        role: membership.role,
        permissions: [...permissions],
      });

      // Attach org context to req.auth
      req.auth.orgContext = {
        organizationId: orgId,
        membership,
        permissions: [...permissions], // Convert readonly to mutable array
      };

      next();
    } catch (error) {
      // Handle database errors
      logger.error('Organization membership check failed', {
        event: 'authz.membership.error',
        userId,
        organizationId: orgId,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      });

      res.status(500).json({
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};
