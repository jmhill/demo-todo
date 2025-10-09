// Public API for Auth domain
export { createAuthService, type AuthService } from './domain/auth-service.js';
export { createAuthRouter } from './application/auth-router.js';
export { createAuthMiddleware } from './application/auth-middleware.js';
export { createInMemoryTokenStore } from './domain/token-store.js';

// Authorization schemas and types
export {
  PermissionSchema,
  OrgContextSchema,
  AuthorizationErrorSchema,
  RoleDefinitions,
  getPermissionsForRole,
  type Permission,
  type OrgContext,
  type AuthorizationError,
} from './domain/authorization-schemas.js';

// Authorization policies
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireCreatorOrPermission,
  custom,
  type Policy,
} from './domain/policies.js';

// Type-safe context extraction
export {
  extractAuthContext,
  extractOrgContext,
  extractAuthAndOrgContext,
  type AuthExtractionError,
} from './domain/auth-types.js';
