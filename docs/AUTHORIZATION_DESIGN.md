# Authorization System Design

## Overview

This document outlines a flexible, policy-based authorization system that follows the pattern:

```typescript
authorize: (AuthContext, Policy) -> AuthorizationResult
```

## Core Concepts

### AuthContext

Contains information about the user and optionally the resource being accessed:

```typescript
type AuthContext = {
  user: User;
  resource?: {
    type: string;
    id: string;
    ownerId?: string;
  };
};
```

### Policy

A function that evaluates authorization rules against the AuthContext:

```typescript
type Policy = (context: AuthContext) => Result<void, AuthorizationError>;
```

### AuthorizationResult

Type-safe result using neverthrow's Result type:

```typescript
type AuthorizationResult = Result<void, AuthorizationError>;
```

## Architecture

### File Structure

```
src/auth/
  authorization-types.ts    # Core types
  authorization-errors.ts   # Error types and constructors
  policies.ts              # Pre-built policy builders
  authorization-middleware.ts  # Express middleware factory
```

### Core Types (`authorization-types.ts`)

```typescript
import type { Result } from 'neverthrow';
import type { User } from '../users/user-schemas.js';

export type ResourceContext = {
  type: string;
  id: string;
  ownerId?: string;
};

export type AuthContext = {
  user: User;
  resource?: ResourceContext;
};

export type Policy = (context: AuthContext) => Result<void, AuthorizationError>;

export type AuthorizationResult = Result<void, AuthorizationError>;
```

### Error Types (`authorization-errors.ts`)

```typescript
export type AuthorizationError =
  | { code: 'INSUFFICIENT_PERMISSIONS'; message: string }
  | { code: 'MISSING_ROLE'; required: string; actual?: string }
  | { code: 'UNAUTHORIZED_ACCESS'; resource: string; userId: string }
  | { code: 'POLICY_EVALUATION_FAILED'; message: string; cause?: unknown };

export type ErrorResponse = {
  statusCode: number;
  body: { error: string };
};

export const toErrorResponse = (error: AuthorizationError): ErrorResponse => {
  switch (error.code) {
    case 'INSUFFICIENT_PERMISSIONS':
    case 'MISSING_ROLE':
    case 'UNAUTHORIZED_ACCESS':
      return { statusCode: 403, body: { error: 'Forbidden' } };
    case 'POLICY_EVALUATION_FAILED':
      return { statusCode: 500, body: { error: 'Internal server error' } };
  }
};

// Error constructors
export const insufficientPermissions = (
  message: string,
): AuthorizationError => ({
  code: 'INSUFFICIENT_PERMISSIONS',
  message,
});

export const missingRole = (
  required: string,
  actual?: string,
): AuthorizationError => ({
  code: 'MISSING_ROLE',
  required,
  actual,
});

export const unauthorizedAccess = (
  resource: string,
  userId: string,
): AuthorizationError => ({
  code: 'UNAUTHORIZED_ACCESS',
  resource,
  userId,
});

export const policyEvaluationFailed = (
  message: string,
  cause?: unknown,
): AuthorizationError => ({
  code: 'POLICY_EVALUATION_FAILED',
  message,
  cause,
});
```

### Policy Builders (`policies.ts`)

```typescript
import { ok, err } from 'neverthrow';
import type { Policy, AuthContext } from './authorization-types.js';
import {
  missingRole,
  insufficientPermissions,
  unauthorizedAccess,
} from './authorization-errors.js';

/**
 * Requires user to have a specific role
 */
export const requireRole = (requiredRole: string): Policy => {
  return (context: AuthContext) => {
    const userRole = context.user.role;

    if (!userRole || userRole !== requiredRole) {
      return err(missingRole(requiredRole, userRole));
    }

    return ok(undefined);
  };
};

/**
 * Requires user to have a specific permission
 */
export const requirePermission = (permission: string): Policy => {
  return (context: AuthContext) => {
    const permissions = context.user.permissions || [];

    if (!permissions.includes(permission)) {
      return err(insufficientPermissions(`Missing permission: ${permission}`));
    }

    return ok(undefined);
  };
};

/**
 * Requires user to be the owner of the resource
 */
export const requireOwnership = (): Policy => {
  return (context: AuthContext) => {
    if (!context.resource) {
      return err(insufficientPermissions('No resource context provided'));
    }

    if (!context.resource.ownerId) {
      return err(insufficientPermissions('Resource has no owner'));
    }

    if (context.user.id !== context.resource.ownerId) {
      return err(
        unauthorizedAccess(
          `${context.resource.type}:${context.resource.id}`,
          context.user.id,
        ),
      );
    }

    return ok(undefined);
  };
};

/**
 * All policies must pass (AND logic)
 */
export const and = (...policies: Policy[]): Policy => {
  return (context: AuthContext) => {
    for (const policy of policies) {
      const result = policy(context);
      if (result.isErr()) {
        return result;
      }
    }
    return ok(undefined);
  };
};

/**
 * At least one policy must pass (OR logic)
 */
export const or = (...policies: Policy[]): Policy => {
  return (context: AuthContext) => {
    const errors: AuthorizationError[] = [];

    for (const policy of policies) {
      const result = policy(context);
      if (result.isOk()) {
        return ok(undefined);
      }
      errors.push(result.error);
    }

    // All policies failed
    return err(
      insufficientPermissions(
        `All authorization policies failed: ${errors.map((e) => e.code).join(', ')}`,
      ),
    );
  };
};

/**
 * Custom policy with user-defined logic
 */
export const custom = (
  evaluator: (context: AuthContext) => boolean,
  errorMessage: string,
): Policy => {
  return (context: AuthContext) => {
    if (evaluator(context)) {
      return ok(undefined);
    }
    return err(insufficientPermissions(errorMessage));
  };
};
```

### Middleware Factory (`authorization-middleware.ts`)

```typescript
import type { Request, Response, NextFunction } from 'express';
import type { Policy, AuthContext } from './authorization-types.js';
import { toErrorResponse } from './authorization-errors.js';

export interface AuthorizeOptions {
  policy: Policy;
  resourceGetter?: (
    req: Request,
  ) => Promise<{ type: string; id: string; ownerId?: string } | null>;
}

/**
 * Creates authorization middleware that evaluates a policy
 */
export const createAuthorizationMiddleware = (options: AuthorizeOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // User must be authenticated first
    if (!req.auth?.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Build auth context
    const context: AuthContext = {
      user: req.auth.user,
    };

    // Optionally fetch resource context
    if (options.resourceGetter) {
      try {
        const resource = await options.resourceGetter(req);
        if (resource) {
          context.resource = resource;
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to load resource context' });
        return;
      }
    }

    // Evaluate policy
    const result = options.policy(context);

    if (result.isErr()) {
      const errorResponse = toErrorResponse(result.error);
      res.status(errorResponse.statusCode).json(errorResponse.body);
      return;
    }

    next();
  };
};

/**
 * Convenience function for simple policies without resource context
 */
export const authorize = (policy: Policy) => {
  return createAuthorizationMiddleware({ policy });
};
```

## Usage Examples

### Basic Role Check

```typescript
import { requireRole } from './auth/policies.js';
import { authorize } from './auth/authorization-middleware.js';

// Only admins can delete users
app.delete(
  '/users/:id',
  requireAuth,
  authorize(requireRole('admin')),
  deleteUserHandler(userService),
);
```

### Permission Check

```typescript
import { requirePermission } from './auth/policies.js';
import { authorize } from './auth/authorization-middleware.js';

// Only users with 'manage:todos' permission can bulk-update
app.patch(
  '/todos/bulk',
  requireAuth,
  authorize(requirePermission('manage:todos')),
  bulkUpdateTodosHandler(todoService),
);
```

### Ownership Check

```typescript
import { requireOwnership } from './auth/policies.js';
import { createAuthorizationMiddleware } from './auth/authorization-middleware.js';

// Only the todo owner can complete it
app.patch(
  '/todos/:id/complete',
  requireAuth,
  createAuthorizationMiddleware({
    policy: requireOwnership(),
    resourceGetter: async (req) => {
      const todo = await todoService.getTodoById({
        todoId: req.params.id,
        userId: req.auth!.user.id,
      });

      if (todo.isErr()) return null;

      return {
        type: 'todo',
        id: todo.value.id,
        ownerId: todo.value.userId,
      };
    },
  }),
  completeTodoHandler(todoService),
);
```

### Composite Policies (Admin OR Owner)

```typescript
import { or, requireRole, requireOwnership } from './auth/policies.js';
import { createAuthorizationMiddleware } from './auth/authorization-middleware.js';

// Admins OR owners can delete todos
app.delete(
  '/todos/:id',
  requireAuth,
  createAuthorizationMiddleware({
    policy: or(requireRole('admin'), requireOwnership()),
    resourceGetter: async (req) => {
      const todo = await todoService.getTodoById({
        todoId: req.params.id,
        userId: req.auth!.user.id,
      });

      if (todo.isErr()) return null;

      return {
        type: 'todo',
        id: todo.value.id,
        ownerId: todo.value.userId,
      };
    },
  }),
  deleteTodoHandler(todoService),
);
```

### Custom Policy

```typescript
import { custom } from './auth/policies.js';
import { authorize } from './auth/authorization-middleware.js';

// Only users with verified emails can post
app.post(
  '/todos',
  requireAuth,
  authorize(
    custom(
      (context) => context.user.emailVerified === true,
      'Email verification required',
    ),
  ),
  createTodoHandler(todoService),
);
```

## Database Schema Updates

To support roles and permissions, update the User schema:

### Migration: Add role and permissions

```typescript
export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  await queryInterface.addColumn('users', 'role', {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'user',
  });

  await queryInterface.addColumn('users', 'permissions', {
    type: DataTypes.JSON,
    allowNull: true,
  });

  await queryInterface.addIndex('users', ['role'], {
    name: 'users_role_index',
  });
};
```

### Update User Schema

```typescript
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(50),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

## Testing Strategy

### Unit Tests

Test policies in isolation:

```typescript
describe('requireRole', () => {
  it('should pass when user has required role', () => {
    const policy = requireRole('admin');
    const context: AuthContext = {
      user: { ...mockUser, role: 'admin' },
    };

    const result = policy(context);
    expect(result.isOk()).toBe(true);
  });

  it('should fail when user lacks required role', () => {
    const policy = requireRole('admin');
    const context: AuthContext = {
      user: { ...mockUser, role: 'user' },
    };

    const result = policy(context);
    expect(result.isErr()).toBe(true);
    expect(result.error.code).toBe('MISSING_ROLE');
  });
});
```

### Integration Tests

Test middleware with Express:

```typescript
describe('Authorization Middleware', () => {
  it('should return 403 when user lacks role', async () => {
    const { token } = await createAuthenticatedUser(app, { role: 'user' });

    const response = await request(app)
      .delete('/admin/users/123')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body.error).toBe('Forbidden');
  });
});
```

### Acceptance Tests

Test end-to-end authorization flows:

```typescript
describe('Todo Authorization (Acceptance)', () => {
  it('should prevent users from completing other users todos', async () => {
    const { token: token1 } = await createAuthenticatedUser(app);
    const { token: token2 } = await createAuthenticatedUser(app, {
      email: 'user2@example.com',
      username: 'user2',
    });

    // User 1 creates todo
    const createResponse = await request(app)
      .post('/todos')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'User 1 todo' });

    const todoId = createResponse.body.id;

    // User 2 tries to complete it
    const response = await request(app)
      .patch(`/todos/${todoId}/complete`)
      .set('Authorization', `Bearer ${token2}`)
      .expect(403);

    expect(response.body.error).toBe('Forbidden');
  });
});
```

## Benefits

1. **Type Safety**: Uses neverthrow's Result type for error handling
2. **Composability**: Combine policies with `and()` and `or()`
3. **Flexibility**: Create custom policies for specific needs
4. **Testability**: Policies are pure functions, easy to unit test
5. **Consistency**: Follows existing patterns (factory functions, dependency injection)
6. **Separation of Concerns**: Authorization logic separate from business logic
7. **Reusability**: Define policies once, use across multiple routes
8. **Clear Intent**: Policy names make authorization requirements obvious

## Migration Path

1. **Phase 1**: Add role/permissions to User schema and migrations
2. **Phase 2**: Implement core authorization types and policies
3. **Phase 3**: Add authorization middleware factory
4. **Phase 4**: Gradually add authorization to routes, starting with admin operations
5. **Phase 5**: Add resource ownership checks to user-specific operations
6. **Phase 6**: Write comprehensive tests for all authorization scenarios

## Future Enhancements

- **Attribute-Based Access Control (ABAC)**: Evaluate policies based on user attributes, resource attributes, and environmental context
- **Policy Caching**: Cache policy evaluation results for performance
- **Audit Logging**: Log all authorization decisions for compliance
- **Dynamic Policies**: Load policies from database or external service
- **Permission Hierarchies**: Support permission inheritance (e.g., `admin` includes all `user` permissions)
