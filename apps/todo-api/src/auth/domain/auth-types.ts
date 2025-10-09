import type { Request } from 'express';
import { err, ok, type Result } from 'neverthrow';
import type { User } from '../../users/domain/user-schemas.js';
import type { OrgContext } from './authorization-schemas.js';

/**
 * Extend Express Request type to include auth context with optional orgContext
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: {
        user: User;
        token: string;
        orgContext?: OrgContext; // Attached by requireOrgMembership middleware
      };
    }
  }
}

/**
 * Errors that can occur during context extraction
 */
export type AuthExtractionError =
  | { code: 'MISSING_AUTH'; message: string }
  | { code: 'MISSING_ORG_CONTEXT'; message: string };

/**
 * Extract authenticated user from request
 * Returns Result - no manual assertions needed!
 */
export const extractAuthContext = (
  req: Request,
): Result<{ user: User; token: string }, AuthExtractionError> => {
  if (!req.auth) {
    return err({
      code: 'MISSING_AUTH',
      message: 'Authentication required',
    });
  }

  return ok({
    user: req.auth.user,
    token: req.auth.token,
  });
};

/**
 * Extract org context from request
 * Returns Result - no manual assertions needed!
 */
export const extractOrgContext = (
  req: Request,
): Result<OrgContext, AuthExtractionError> => {
  if (!req.auth?.orgContext) {
    return err({
      code: 'MISSING_ORG_CONTEXT',
      message: 'Organization context required',
    });
  }

  return ok(req.auth.orgContext);
};

/**
 * Extract both auth and org context
 * Most common pattern in handlers
 */
export const extractAuthAndOrgContext = (
  req: Request,
): Result<
  { user: User; token: string; orgContext: OrgContext },
  AuthExtractionError
> => {
  return extractAuthContext(req).andThen((authContext) =>
    extractOrgContext(req).map((orgContext) => ({
      ...authContext,
      orgContext,
    })),
  );
};
