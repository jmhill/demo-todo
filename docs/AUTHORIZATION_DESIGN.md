# Multi-Tenant Authorization Implementation Plan

## Overview

This document outlines the phased implementation of a multi-tenant, permission-based authorization system for the demo-todo application. The design follows these core principles:

- **Schema-first with Zod** - All types derived from runtime schemas
- **Pure domain services** - No authorization logic in business code
- **Permission-based** - Granular permissions, not role hierarchies
- **Declarative middleware** - Per-endpoint permission checks using ts-rest
- **Type-safe context extraction** - No manual assertions via helper functions
- **Separation of concerns** - Authorization is a cross-cutting concern, separate from domain logic

### Why Multi-Tenant?

The single-user-owns-todos model is being replaced with an organization/workspace model where:

- Multiple users can belong to an organization
- Todos belong to organizations (not individual users)
- Users access resources through organization membership
- Granular permissions control what users can do within organizations

## Implementation Progress

### Phase 1: Organizations and Membership Foundation ✅ (95% Complete)

**✅ Completed:**

- Database migrations (7 migrations):
  - `003-create-organizations-table.ts` - Organizations table with slug index
  - `004-create-organization-memberships-table.ts` - Memberships with roles and constraints
  - `005-add-organization-to-todos.ts` - Add organizationId and createdBy to todos
  - `006-backfill-organization-data.ts` - Migrate existing data (one org per user)
  - `007-finalize-todos-migration.ts` - Remove old userId column, enforce constraints
- Domain layer:
  - Organization schemas (Zod-first): Organization, OrganizationMembership, OrganizationRole
  - Organization service with full business logic (23 unit tests passing)
  - In-memory stores for organizations and memberships (for testing)
  - Updated Todo schemas to use organizationId and createdBy instead of userId
  - Updated TodoService interface (pure domain logic, no authorization)
  - Updated TodoStore interface (changed findByUserId to findById)
- Infrastructure:
  - Updated Sequelize todo model and store
  - Updated in-memory todo store
  - Updated seed script to create organizations and memberships
  - Updated test helpers (cleanDatabase, createAuthenticatedUser)
- Tests:
  - All domain service tests passing (172 unit tests)
  - All acceptance tests passing (70 tests, 2 skipped for Phase 2)
  - Updated all test fixtures and data
- Quality:
  - All TypeScript errors resolved
  - All quality checks passing (format, lint, typecheck, tests)

**🔄 Remaining:**

- Implement Sequelize organization store (infrastructure adapter)
- Implement Sequelize membership store (infrastructure adapter)
- Create basic organization API contracts (CRUD operations)
- Create organization router
- Wire organization routes in app.ts

**Next Steps:**

1. Create Sequelize organization store with tests
2. Create Sequelize membership store with tests
3. Define organization API contracts in api-contracts package
4. Implement organization router with basic CRUD
5. Wire up organization routes in app.ts

### Phase 2: Permission-Based Authorization (Not Started)

**Planned:**

- Define permission schema and role definitions
- Create authorization context schema (OrgContext)
- Implement authorization policies (pure functions)
- Create type-safe context extraction helpers
- Unit tests for policies

### Phase 3: Authorization Middleware (Not Started)

**Planned:**

- Implement requireOrgMembership middleware
- Implement requirePermissions middleware factory
- Integration tests for middleware
- Update global middleware in app.ts

### Phase 4: Router Updates and Integration (Not Started)

**Planned:**

- Update API contracts with org-scoped paths (/orgs/:orgId/todos)
- Update todo router with per-endpoint middleware
- Add resource-specific authorization in handlers
- Acceptance tests for authorization flows
- Update frontend to use org-scoped endpoints

---

## Phase 1: Organizations and Membership

### 1.1 Database Schema

#### Organizations Table

```sql
CREATE TABLE organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Organization Memberships Table

```sql
CREATE TABLE organization_memberships (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  role ENUM('owner', 'admin', 'member', 'viewer') NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_org (user_id, organization_id),
  INDEX idx_user_id (user_id),
  INDEX idx_organization_id (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Update Todos Table

```sql
-- Add organization relationship
ALTER TABLE todos
  ADD COLUMN organization_id VARCHAR(36) NOT NULL AFTER id,
  ADD COLUMN created_by VARCHAR(36) NOT NULL AFTER organization_id,
  ADD FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  ADD INDEX idx_organization_id (organization_id);

-- Remove old user_id column (replaced by created_by)
ALTER TABLE todos DROP COLUMN user_id;
```

### 1.2 Domain Schemas (Schema-First)

```typescript
// src/organizations/domain/organization-schemas.ts
import { z } from 'zod';

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationCommandSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  createdByUserId: z.string().uuid(),
});

export type CreateOrganizationCommand = z.infer<
  typeof CreateOrganizationCommandSchema
>;

// Roles defined as enum
export const OrganizationRoleSchema = z.enum([
  'owner',
  'admin',
  'member',
  'viewer',
]);
export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

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
```

### 1.3 Domain Services

```typescript
// src/organizations/domain/organization-service.ts
import type { Result, ResultAsync } from 'neverthrow';
import type {
  Organization,
  OrganizationMembership,
} from './organization-schemas.js';

// Port: OrganizationStore interface
export interface OrganizationStore {
  save(org: Organization): Promise<void>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  update(org: Organization): Promise<void>;
}

// Port: OrganizationMembershipStore interface
export interface OrganizationMembershipStore {
  save(membership: OrganizationMembership): Promise<void>;
  findByUserAndOrg(options: {
    userId: string;
    organizationId: string;
  }): ResultAsync<OrganizationMembership | null, Error>;
  findByOrganizationId(orgId: string): Promise<OrganizationMembership[]>;
  findByUserId(userId: string): Promise<OrganizationMembership[]>;
  update(membership: OrganizationMembership): Promise<void>;
  delete(membershipId: string): Promise<void>;
}

// Domain service for organization operations
export interface OrganizationService {
  createOrganization(command: {
    name: string;
    slug: string;
    createdByUserId: string;
  }): ResultAsync<Organization, CreateOrganizationError>;

  addMember(options: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }): ResultAsync<OrganizationMembership, AddMemberError>;

  removeMember(membershipId: string): ResultAsync<void, RemoveMemberError>;

  updateMemberRole(options: {
    membershipId: string;
    newRole: OrganizationRole;
  }): ResultAsync<OrganizationMembership, UpdateMemberError>;
}

// Factory function to create service
export function createOrganizationService(
  orgStore: OrganizationStore,
  membershipStore: OrganizationMembershipStore,
  idGenerator: IdGenerator,
  clock: Clock,
): OrganizationService {
  // Implementation here - pure business logic, no authorization
}
```

### 1.4 Infrastructure Adapters

```typescript
// src/organizations/infrastructure/organization-store-sequelize.ts
import type { Sequelize } from 'sequelize';
import type { OrganizationStore } from '../domain/organization-service.js';

export function createSequelizeOrganizationStore(
  sequelize: Sequelize,
): OrganizationStore {
  // Sequelize model definition and implementation
}

// src/organizations/infrastructure/membership-store-sequelize.ts
export function createSequelizeMembershipStore(
  sequelize: Sequelize,
): OrganizationMembershipStore {
  // Sequelize model definition and implementation
}
```

### 1.5 Update Todo Domain

```typescript
// src/todos/domain/todo-schemas.ts (updated)
export const TodoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(), // ← Changed from userId
  createdBy: z.string().uuid(), // ← Who created it
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
});

export type Todo = z.infer<typeof TodoSchema>;

export const CreateTodoCommandSchema = z.object({
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
});

export type CreateTodoCommand = z.infer<typeof CreateTodoCommandSchema>;
```

```typescript
// src/todos/domain/todo-service.ts (updated interface)
export interface TodoService {
  createTodo(command: {
    organizationId: string;
    createdBy: string;
    title: string;
    description?: string;
  }): ResultAsync<Todo, CreateTodoError>;

  listTodos(organizationId: string): ResultAsync<Todo[], ListTodosError>;

  getTodoById(todoId: string): ResultAsync<Todo, GetTodoError>;

  completeTodo(todoId: string): ResultAsync<Todo, CompleteTodoError>;

  deleteTodo(todoId: string): ResultAsync<void, DeleteTodoError>;
}

// Implementation stays pure - NO authorization logic
export function createTodoService(
  todoStore: TodoStore,
  idGenerator: IdGenerator,
  clock: Clock,
): TodoService {
  // Pure business logic only
}
```

## Phase 2: Permission-Based Authorization

### 2.1 Permission Schema

```typescript
// src/auth/authorization-schemas.ts
import { z } from 'zod';
import { UserSchema } from '../users/domain/user-schemas.js';
import {
  OrganizationMembershipSchema,
  OrganizationRoleSchema,
} from '../organizations/domain/organization-schemas.js';

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
```

### 2.2 Role Definitions (Static Permission Bundles)

```typescript
// src/auth/authorization-schemas.ts (continued)

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
```

### 2.3 Authorization Context

```typescript
// src/auth/authorization-schemas.ts (continued)

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
```

### 2.4 Extended Request Type

```typescript
// src/auth/auth-types.ts
import type { User } from '../users/domain/user-schemas.js';
import type { OrgContext } from './authorization-schemas.js';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: User;
        token: string;
        orgContext?: OrgContext; // ← Attached by requireOrgMembership middleware
      };
    }
  }
}
```

### 2.5 Type-Safe Context Extraction Helpers

```typescript
// src/auth/auth-types.ts (continued)
import type { Request } from 'express';
import { err, ok, type Result } from 'neverthrow';

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
```

### 2.6 Authorization Policies (Pure Functions)

```typescript
// src/auth/policies.ts
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
export const requireAnyPermission = (...permissions: Permission[]): Policy => {
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
export const requireAllPermissions = (...permissions: Permission[]): Policy => {
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
```

## Phase 3: Authorization Middleware

### 3.1 Organization Membership Middleware

```typescript
// src/auth/organization-middleware.ts
import type { Request, Response, NextFunction } from 'express';
import type { OrganizationMembershipStore } from '../organizations/domain/organization-service.js';
import { getPermissionsForRole } from './authorization-schemas.js';

/**
 * Middleware: Fetch org membership and attach to req.auth.orgContext
 * Runs BEFORE handlers for all organization-scoped routes
 *
 * Usage: Apply as globalMiddleware in createExpressEndpoints
 */
export const requireOrgMembership = (
  membershipStore: OrganizationMembershipStore,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Auth middleware must have run first
    if (!req.auth) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'MISSING_AUTH',
      });
    }

    const userId = req.auth.user.id;
    const orgId = req.params.orgId; // From route: /orgs/:orgId/...

    if (!orgId) {
      return res.status(400).json({
        message: 'Organization ID required',
        code: 'INVALID_REQUEST',
      });
    }

    // Fetch membership (single query)
    const membershipResult = await membershipStore.findByUserAndOrg({
      userId,
      organizationId: orgId,
    });

    if (membershipResult.isErr() || !membershipResult.value) {
      return res.status(403).json({
        message: 'Not a member of this organization',
        code: 'NOT_MEMBER',
      });
    }

    const membership = membershipResult.value;

    // Resolve permissions from role
    const permissions = getPermissionsForRole(membership.role);

    // Attach org context to req.auth
    req.auth.orgContext = {
      organizationId: orgId,
      membership,
      permissions: [...permissions], // Convert readonly to mutable array
    };

    next();
  };
};
```

### 3.2 Permission Middleware Factory

```typescript
// src/auth/authorization-middleware.ts
import type { Request, Response, NextFunction } from 'express';
import type { Permission } from './authorization-schemas.js';
import { requirePermission, requireAnyPermission } from './policies.js';
import { extractOrgContext } from './auth-types.js';

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
export const requirePermissions = (...permissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Extract org context (attached by requireOrgMembership)
    const contextResult = extractOrgContext(req);

    if (contextResult.isErr()) {
      return res.status(401).json({
        message: contextResult.error.message,
        code: 'MISSING_AUTH',
      });
    }

    const orgContext = contextResult.value;

    // Check permissions using policy
    const policy =
      permissions.length === 1
        ? requirePermission(permissions[0])
        : requireAnyPermission(...permissions);

    const authResult = policy(orgContext);

    if (authResult.isErr()) {
      const error = authResult.error;

      if (error.code === 'MISSING_PERMISSION') {
        return res.status(403).json({
          message: `Missing required permission: ${error.required}`,
          code: 'MISSING_PERMISSION',
        });
      }

      return res.status(403).json({
        message: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};
```

### 3.3 Middleware Integration Pattern

```
Request Flow:

  HTTP Request
    ↓
  requireAuth (global)
    → Verifies JWT
    → Attaches req.auth.user
    ↓
  requireOrgMembership (global for org routes)
    → Fetches membership
    → Resolves permissions
    → Attaches req.auth.orgContext
    ↓
  requirePermissions(...) (per-endpoint, optional)
    → Checks specific permission(s)
    → Fails fast if missing
    ↓
  Handler
    → Fetch resource (if needed)
    → Resource-specific authorization (if needed)
    → Call domain service
    → Map Result to HTTP response
```

## Phase 4: Router Updates and Integration

### 4.1 Update API Contracts

```typescript
// libs/api-contracts/src/todo-contract.ts (updated)
import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateTodoRequestSchema, TodoResponseSchema } from './todo-schemas.js';

const c = initContract();

export const todoContract = c.router({
  createTodo: {
    method: 'POST',
    path: '/orgs/:orgId/todos', // ← Organization-scoped path
    body: CreateTodoRequestSchema,
    responses: {
      201: TodoResponseSchema,
      401: z.object({ message: z.string(), code: z.literal('INVALID_TOKEN') }),
      403: z.object({
        message: z.string(),
        code: z.literal('MISSING_PERMISSION'),
      }),
      500: z.object({
        message: z.string(),
        code: z.literal('UNEXPECTED_ERROR'),
      }),
    },
    summary: 'Create a new todo in organization',
    strictStatusCodes: true,
  },

  listTodos: {
    method: 'GET',
    path: '/orgs/:orgId/todos',
    responses: {
      200: z.array(TodoResponseSchema),
      401: z.object({ message: z.string(), code: z.literal('INVALID_TOKEN') }),
      403: z.object({
        message: z.string(),
        code: z.literal('MISSING_PERMISSION'),
      }),
      500: z.object({
        message: z.string(),
        code: z.literal('UNEXPECTED_ERROR'),
      }),
    },
    summary: 'List all todos in organization',
    strictStatusCodes: true,
  },

  getTodoById: {
    method: 'GET',
    path: '/orgs/:orgId/todos/:id',
    responses: {
      200: TodoResponseSchema,
      401: z.object({ message: z.string(), code: z.literal('INVALID_TOKEN') }),
      403: z.object({
        message: z.string(),
        code: z.literal('MISSING_PERMISSION'),
      }),
      404: z.object({ message: z.string(), code: z.literal('TODO_NOT_FOUND') }),
      500: z.object({
        message: z.string(),
        code: z.literal('UNEXPECTED_ERROR'),
      }),
    },
    summary: 'Get todo by ID',
    strictStatusCodes: true,
  },

  completeTodo: {
    method: 'PATCH',
    path: '/orgs/:orgId/todos/:id/complete',
    body: z.void(),
    responses: {
      200: TodoResponseSchema,
      400: z.object({
        message: z.string(),
        code: z.literal('TODO_ALREADY_COMPLETED'),
      }),
      401: z.object({ message: z.string(), code: z.literal('INVALID_TOKEN') }),
      403: z.object({
        message: z.string(),
        code: z.literal('UNAUTHORIZED_ACCESS'),
      }),
      404: z.object({ message: z.string(), code: z.literal('TODO_NOT_FOUND') }),
      500: z.object({
        message: z.string(),
        code: z.literal('UNEXPECTED_ERROR'),
      }),
    },
    summary: 'Mark todo as complete',
    strictStatusCodes: true,
  },

  deleteTodo: {
    method: 'DELETE',
    path: '/orgs/:orgId/todos/:id',
    responses: {
      204: z.void(),
      401: z.object({ message: z.string(), code: z.literal('INVALID_TOKEN') }),
      403: z.object({
        message: z.string(),
        code: z.literal('MISSING_PERMISSION'),
      }),
      404: z.object({ message: z.string(), code: z.literal('TODO_NOT_FOUND') }),
      500: z.object({
        message: z.string(),
        code: z.literal('UNEXPECTED_ERROR'),
      }),
    },
    summary: 'Delete todo',
    strictStatusCodes: true,
  },
});
```

### 4.2 Update Todo Router

```typescript
// src/todos/application/todo-router.ts (updated)
import { initServer } from '@ts-rest/express';
import { todoContract, type TodoResponse } from '@demo-todo/api-contracts';
import type { TodoService } from '../domain/todo-service.js';
import type { Todo } from '../domain/todo-schemas.js';
import { requirePermissions } from '../../auth/authorization-middleware.js';
import { extractAuthAndOrgContext } from '../../auth/auth-types.js';
import { requireCreatorOrPermission } from '../../auth/policies.js';

const s = initServer();

const toTodoResponse = (todo: Todo): TodoResponse => ({
  id: todo.id,
  organizationId: todo.organizationId,
  createdBy: todo.createdBy,
  title: todo.title,
  description: todo.description,
  completed: todo.completed,
  createdAt: todo.createdAt.toISOString(),
  updatedAt: todo.updatedAt.toISOString(),
  completedAt: todo.completedAt?.toISOString(),
});

export const createTodoRouter = (todoService: TodoService) => {
  return s.router(todoContract, {
    // Simple case: Permission check via middleware
    createTodo: {
      middleware: [requirePermissions('todos:create')],
      handler: async ({ body, req }) => {
        const contextResult = extractAuthAndOrgContext(req);
        if (contextResult.isErr()) {
          return {
            status: 401,
            body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
          };
        }

        const { user, orgContext } = contextResult.value;

        const result = await todoService.createTodo({
          organizationId: orgContext.organizationId,
          createdBy: user.id,
          title: body.title,
          description: body.description,
        });

        return result.match(
          (todo) => ({ status: 201, body: toTodoResponse(todo) }),
          () => ({
            status: 500,
            body: {
              message: 'Internal server error',
              code: 'UNEXPECTED_ERROR',
            },
          }),
        );
      },
    },

    // Simple case: Read permission
    listTodos: {
      middleware: [requirePermissions('todos:read')],
      handler: async ({ req }) => {
        const contextResult = extractAuthAndOrgContext(req);
        if (contextResult.isErr()) {
          return {
            status: 401,
            body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
          };
        }

        const { orgContext } = contextResult.value;

        const result = await todoService.listTodos(orgContext.organizationId);

        return result.match(
          (todos) => ({ status: 200, body: todos.map(toTodoResponse) }),
          () => ({
            status: 500,
            body: {
              message: 'Internal server error',
              code: 'UNEXPECTED_ERROR',
            },
          }),
        );
      },
    },

    // Simple case: Read permission
    getTodoById: {
      middleware: [requirePermissions('todos:read')],
      handler: async ({ params }) => {
        const result = await todoService.getTodoById(params.id);

        return result.match(
          (todo) => ({ status: 200, body: toTodoResponse(todo) }),
          (error) => {
            if (error.code === 'TODO_NOT_FOUND') {
              return {
                status: 404,
                body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
              };
            }
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
          },
        );
      },
    },

    // Complex case: Resource-specific authorization
    // Members can complete their own todos, OR need todos:complete permission
    completeTodo: {
      // NO permission middleware - check in handler after fetch
      handler: async ({ params, req }) => {
        const contextResult = extractAuthAndOrgContext(req);
        if (contextResult.isErr()) {
          return {
            status: 401,
            body: { message: 'Unauthorized', code: 'INVALID_TOKEN' },
          };
        }

        const { orgContext } = contextResult.value;

        // Fetch resource first
        const todoResult = await todoService.getTodoById(params.id);

        if (todoResult.isErr()) {
          return {
            status: 404,
            body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
          };
        }

        const todo = todoResult.value;

        // Resource-specific authorization
        const authResult = requireCreatorOrPermission('todos:complete')(
          orgContext,
          { createdBy: todo.createdBy },
        );

        if (authResult.isErr()) {
          return {
            status: 403,
            body: { message: 'Forbidden', code: 'UNAUTHORIZED_ACCESS' },
          };
        }

        // Call domain service
        const result = await todoService.completeTodo(params.id);

        return result.match(
          (completed) => ({ status: 200, body: toTodoResponse(completed) }),
          (error) => {
            if (error.code === 'TODO_ALREADY_COMPLETED') {
              return {
                status: 400,
                body: {
                  message: 'Already completed',
                  code: 'TODO_ALREADY_COMPLETED',
                },
              };
            }
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
          },
        );
      },
    },

    // Simple case: Delete permission
    deleteTodo: {
      middleware: [requirePermissions('todos:delete')],
      handler: async ({ params }) => {
        const result = await todoService.deleteTodo(params.id);

        return result.match(
          () => ({ status: 204, body: undefined }),
          (error) => {
            if (error.code === 'TODO_NOT_FOUND') {
              return {
                status: 404,
                body: { message: 'Todo not found', code: 'TODO_NOT_FOUND' },
              };
            }
            return {
              status: 500,
              body: {
                message: 'Internal server error',
                code: 'UNEXPECTED_ERROR',
              },
            };
          },
        );
      },
    },
  });
};
```

### 4.3 Wire Everything in App

```typescript
// src/app.ts (updated)
export function createApp(config: AppConfig): Express {
  const sequelize = createSequelize(config.database);

  // Create stores
  const userStore = createSequelizeUserStore(sequelize);
  const orgStore = createSequelizeOrganizationStore(sequelize);
  const membershipStore = createSequelizeMembershipStore(sequelize);
  const todoStore = createSequelizeTodoStore(sequelize);

  // Create services
  const userService = createUserService(userStore, ...);
  const authService = createAuthService({ userService, ... });
  const orgService = createOrganizationService(orgStore, membershipStore, ...);
  const todoService = createTodoService(todoStore, ...);

  const app = express();

  // ... security middleware ...

  // Create middleware
  const requireAuth = createAuthMiddleware(authService, userService);
  const requireOrg = requireOrgMembership(membershipStore);

  // Auth routes (no auth required)
  const authRouter = createAuthRouter(authService);
  createExpressEndpoints(authContract, authRouter, app, {
    logInitialization: false,
  });

  // User routes (auth required)
  const userRouter = createUserRouter(userService);
  createExpressEndpoints(userContract, userRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth],
  });

  // Todo routes (auth + org membership required)
  const todoRouter = createTodoRouter(todoService);
  createExpressEndpoints(todoContract, todoRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth, requireOrg], // ← Both global middleware
  });

  // Organization routes (auth + org membership required)
  const orgRouter = createOrganizationRouter(orgService);
  createExpressEndpoints(orgContract, orgRouter, app, {
    logInitialization: false,
    globalMiddleware: [requireAuth, requireOrg],
  });

  return app;
}
```

## Testing Strategy

### Unit Tests: Pure Functions

Test policies and domain services in isolation with in-memory stores.

```typescript
// src/auth/policies.test.ts
describe('Authorization Policies', () => {
  describe('requirePermission', () => {
    it('should allow when user has permission', () => {
      const policy = requirePermission('todos:create');

      const result = policy({
        organizationId: 'org-1',
        membership: {
          userId: 'user-1',
          organizationId: 'org-1',
          role: 'member',
        },
        permissions: ['todos:create', 'todos:read'],
      });

      expect(result.isOk()).toBe(true);
    });

    it('should deny when user lacks permission', () => {
      const policy = requirePermission('todos:delete');

      const result = policy({
        organizationId: 'org-1',
        membership: {
          userId: 'user-1',
          organizationId: 'org-1',
          role: 'member',
        },
        permissions: ['todos:create', 'todos:read'],
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe('MISSING_PERMISSION');
    });
  });

  describe('requireCreatorOrPermission', () => {
    it('should allow creator without permission', () => {
      const policy = requireCreatorOrPermission('todos:complete');

      const result = policy(
        {
          organizationId: 'org-1',
          membership: {
            userId: 'user-1',
            organizationId: 'org-1',
            role: 'member',
          },
          permissions: ['todos:read'], // No complete permission
        },
        { createdBy: 'user-1' }, // But user is creator
      );

      expect(result.isOk()).toBe(true);
    });

    it('should allow non-creator with permission', () => {
      const policy = requireCreatorOrPermission('todos:complete');

      const result = policy(
        {
          organizationId: 'org-1',
          membership: {
            userId: 'user-2',
            organizationId: 'org-1',
            role: 'admin',
          },
          permissions: ['todos:complete'], // Has permission
        },
        { createdBy: 'user-1' }, // Not creator
      );

      expect(result.isOk()).toBe(true);
    });

    it('should deny non-creator without permission', () => {
      const policy = requireCreatorOrPermission('todos:complete');

      const result = policy(
        {
          organizationId: 'org-1',
          membership: {
            userId: 'user-2',
            organizationId: 'org-1',
            role: 'member',
          },
          permissions: ['todos:read'], // No permission
        },
        { createdBy: 'user-1' }, // Not creator
      );

      expect(result.isErr()).toBe(true);
    });
  });
});

// src/todos/domain/todo-service.test.ts
describe('TodoService (Unit)', () => {
  it('should create todo with valid business logic', async () => {
    const todoStore = createInMemoryTodoStore();
    const service = createTodoService(
      todoStore,
      createUuidGenerator(),
      createSystemClock(),
    );

    const result = await service.createTodo({
      organizationId: 'org-1',
      createdBy: 'user-1',
      title: 'Buy groceries',
      description: 'Milk, eggs',
    });

    expect(result.isOk()).toBe(true);
    const todo = result._unsafeUnwrap();
    expect(todo.title).toBe('Buy groceries');
    expect(todo.completed).toBe(false);
  });

  it('should enforce business rule: title required', async () => {
    const todoStore = createInMemoryTodoStore();
    const service = createTodoService(
      todoStore,
      createUuidGenerator(),
      createSystemClock(),
    );

    const result = await service.createTodo({
      organizationId: 'org-1',
      createdBy: 'user-1',
      title: '   ', // Invalid
      description: 'Test',
    });

    expect(result.isErr()).toBe(true);
  });

  // NO authorization tests here - domain is pure!
});
```

### Integration Tests: Middleware

Test middleware with mock stores.

```typescript
// src/auth/authorization-middleware.test.ts
describe('requirePermissions middleware', () => {
  it('should allow request when user has permission', async () => {
    const req = {
      auth: {
        user: { id: 'user-1' },
        orgContext: {
          organizationId: 'org-1',
          membership: { role: 'member' },
          permissions: ['todos:create', 'todos:read'],
        },
      },
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    const middleware = requirePermissions('todos:create');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should deny request when user lacks permission', async () => {
    const req = {
      auth: {
        user: { id: 'user-1' },
        orgContext: {
          organizationId: 'org-1',
          membership: { role: 'viewer' },
          permissions: ['todos:read'],
        },
      },
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    const middleware = requirePermissions('todos:create');
    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### Acceptance Tests: End-to-End

Test through HTTP API with real infrastructure (TestContainers).

```typescript
// tests/acceptance/todos/todo-authorization.test.ts
describe('Todo Authorization (Acceptance)', () => {
  it('should prevent non-members from accessing org todos', async () => {
    const { token: token1 } = await createAuthenticatedUser(app);
    const { token: token2, user: user2 } = await createAuthenticatedUser(app, {
      email: 'user2@example.com',
      username: 'user2',
    });

    // User 1 creates org
    const org = await createOrganization(app, token1, {
      name: 'Test Org',
      slug: 'test-org',
    });

    // User 2 (not a member) tries to list todos
    const response = await request(app)
      .get(`/orgs/${org.id}/todos`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);

    expect(response.body.code).toBe('NOT_MEMBER');
  });

  it('should allow members to create todos', async () => {
    const { token, user } = await createAuthenticatedUser(app);
    const org = await createOrganization(app, token, {
      name: 'Org',
      slug: 'org',
    });

    const response = await request(app)
      .post(`/orgs/${org.id}/todos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test todo' })
      .expect(201);

    expect(response.body.title).toBe('Test todo');
    expect(response.body.createdBy).toBe(user.id);
  });

  it('should allow creators to complete their own todos', async () => {
    const { token, user } = await createAuthenticatedUser(app);
    const org = await createOrganization(app, token, {
      name: 'Org',
      slug: 'org',
    });

    // Create todo
    const todo = await createTodo(app, token, org.id, { title: 'My todo' });

    // Complete own todo
    const response = await request(app)
      .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.completed).toBe(true);
  });

  it('should prevent members from completing others todos', async () => {
    const { token: token1 } = await createAuthenticatedUser(app);
    const { token: token2 } = await createAuthenticatedUser(app, {
      email: 'user2@example.com',
      username: 'user2',
    });

    const org = await createOrganization(app, token1, {
      name: 'Org',
      slug: 'org',
    });

    // Add user2 as member
    await addOrgMember(app, token1, org.id, {
      userId: user2.id,
      role: 'member',
    });

    // User1 creates todo
    const todo = await createTodo(app, token1, org.id, { title: 'Todo 1' });

    // User2 tries to complete it
    const response = await request(app)
      .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);

    expect(response.body.code).toBe('UNAUTHORIZED_ACCESS');
  });

  it('should allow admins to complete any todo', async () => {
    const { token: token1 } = await createAuthenticatedUser(app);
    const { token: token2, user: user2 } = await createAuthenticatedUser(app, {
      email: 'admin@example.com',
      username: 'admin',
    });

    const org = await createOrganization(app, token1, {
      name: 'Org',
      slug: 'org',
    });

    // Add user2 as admin
    await addOrgMember(app, token1, org.id, {
      userId: user2.id,
      role: 'admin',
    });

    // User1 creates todo
    const todo = await createTodo(app, token1, org.id, { title: 'Todo 1' });

    // Admin completes it (has todos:complete permission)
    const response = await request(app)
      .patch(`/orgs/${org.id}/todos/${todo.id}/complete`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(200);

    expect(response.body.completed).toBe(true);
  });

  it('should prevent members from deleting todos', async () => {
    const { token } = await createAuthenticatedUser(app);
    const org = await createOrganization(app, token, {
      name: 'Org',
      slug: 'org',
    });
    const todo = await createTodo(app, token, org.id, { title: 'Test' });

    // Members don't have todos:delete permission
    const response = await request(app)
      .delete(`/orgs/${org.id}/todos/${todo.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.code).toBe('MISSING_PERMISSION');
  });

  it('should allow admins to delete todos', async () => {
    const { token: ownerToken } = await createAuthenticatedUser(app);
    const { token: adminToken, user: adminUser } =
      await createAuthenticatedUser(app, {
        email: 'admin@example.com',
        username: 'admin',
      });

    const org = await createOrganization(app, ownerToken, {
      name: 'Org',
      slug: 'org',
    });
    await addOrgMember(app, ownerToken, org.id, {
      userId: adminUser.id,
      role: 'admin',
    });

    const todo = await createTodo(app, ownerToken, org.id, { title: 'Test' });

    // Admins have todos:delete permission
    await request(app)
      .delete(`/orgs/${org.id}/todos/${todo.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });
});
```

## Approach Comparison

### Approach A: Middleware + Handler Authorization ✅ (Recommended)

**Description:**

- Middleware checks org membership and base permissions
- Handler checks resource-specific authorization when needed

**Pros:**

- ✅ Clear separation of concerns
- ✅ No double fetching (resource fetched once in handler)
- ✅ Pure domain services (no authorization logic)
- ✅ Type-safe extraction via helper functions
- ✅ Flexible for resource-specific logic
- ✅ Works perfectly with ts-rest per-endpoint middleware
- ✅ Declarative for simple cases, flexible for complex cases

**Cons:**

- ❌ Some handlers need authorization code (resource-specific cases)
- ❌ Two-tier complexity (understand when to use middleware vs handler)

**When to use:** Multi-tenant apps with resource-level authorization needs (like ours)

---

### Approach B: All Authorization in Middleware

**Description:**

- All permission checks done in middleware
- Handlers only call domain services

**Pros:**

- ✅ Very declarative
- ✅ Less code in handlers
- ✅ Authorization enforced early

**Cons:**

- ❌ Cannot do resource-specific authorization (e.g., "creator OR admin")
- ❌ Would need to fetch resources in middleware (violates handler responsibility)
- ❌ Less flexible

**When to use:** Simple CRUD APIs where permissions don't depend on resource attributes

---

### Approach C: Authorization in Domain Services

**Description:**

- Services check authorization before executing business logic

**Pros:**

- ✅ Cannot bypass authorization

**Cons:**

- ❌ Violates separation of concerns
- ❌ Domain polluted with authorization logic
- ❌ Wrong dependency direction (domain depends on infrastructure)
- ❌ Breaks hexagonal architecture
- ❌ Hard to test domain logic in isolation

**When to use:** Never in clean architecture projects

---

### Approach D: Authorization Service Layer

**Description:**

- Dedicated authorization service that handlers call

**Pros:**

- ✅ Authorization logic centralized
- ✅ Domain stays pure

**Cons:**

- ❌ Might fetch resources twice
- ❌ Extra layer of indirection
- ❌ Handlers still need to call authorization service

**When to use:** Complex authorization rules shared across many entry points

## Migration Path

### From Current Single-Tenant to Multi-Tenant

1. ✅ **Add organization tables** (Phase 1 - COMPLETED)
   - Run migrations to add organizations and memberships tables
   - Created 7 sequential migrations with proper foreign key handling

2. ✅ **Seed default organizations** (Phase 1 - COMPLETED)
   - Create one organization per existing user
   - Create membership: user is owner of their org
   - Updated seed script to create orgs and memberships

3. ✅ **Migrate todos** (Phase 1 - COMPLETED)
   - Add `organization_id` and `created_by` columns to todos
   - Backfill: set `organization_id` to user's default org, `created_by` to `user_id`
   - Drop old `user_id` column

4. ✅ **Update domain services** (Phase 1 - COMPLETED)
   - Update todo service interface to take org context
   - Keep implementation pure (no authorization)
   - Created organization service with full business logic

5. 🔄 **Complete infrastructure layer** (Phase 1 - IN PROGRESS)
   - Implement Sequelize organization store
   - Implement Sequelize membership store
   - Create basic organization API contracts and router

6. ⏳ **Add authorization infrastructure** (Phase 2)
   - Define permissions and role definitions
   - Create policy functions
   - Add context extraction helpers

7. ⏳ **Create middleware** (Phase 3)
   - Implement org membership middleware
   - Implement permission checking middleware

8. ⏳ **Update routers** (Phase 4)
   - Update contracts with org-scoped paths
   - Update routers with per-endpoint middleware
   - Add resource-specific authorization in handlers where needed

9. ⏳ **Test thoroughly** (All phases)
   - Unit tests for policies
   - Integration tests for middleware
   - Acceptance tests for end-to-end flows

10. ⏳ **Update UI** (Final)
    - Add organization selection
    - Update API client to use org-scoped endpoints

## Summary

### Current Status (Phase 1: 95% Complete)

**Accomplished:**

- ✅ Complete database schema migration (7 migrations)
- ✅ Organization and membership domain models with full business logic
- ✅ Updated todo domain to use multi-tenant model
- ✅ All tests passing (172 unit, 70 acceptance)
- ✅ All TypeScript errors resolved
- ✅ Seed data working with organizations

**Next Immediate Steps:**

1. Create Sequelize organization store
2. Create Sequelize membership store
3. Define organization API contracts
4. Implement organization router
5. Wire up organization routes in app.ts

**Then Begin Phase 2:** Permission-based authorization

### Design Principles Maintained

This implementation maintains:

- ✅ Pure domain services (hexagonal architecture)
- ✅ Schema-first approach (Zod)
- ✅ Type-safe context extraction
- ✅ Comprehensive testing strategy (TDD)
- 🔜 Declarative per-endpoint permission checks (Phase 3)
- 🔜 Flexible resource-specific authorization (Phase 4)

### Phased Implementation Plan

- **Phase 1 (95%):** Foundation with organizations and membership
- **Phase 2 (0%):** Permission-based authorization with static role bundles
- **Phase 3 (0%):** Middleware infrastructure for enforcing permissions
- **Phase 4 (0%):** Integration with ts-rest routers
