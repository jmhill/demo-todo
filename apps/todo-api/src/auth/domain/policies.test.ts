import { describe, it, expect } from 'vitest';
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireCreatorOrPermission,
  custom,
} from './policies.js';
import type { OrgContext, Permission } from './authorization-schemas.js';

describe('Authorization Policies', () => {
  const createMockOrgContext = (
    permissions: Permission[],
    userId = 'user-123',
  ): OrgContext => ({
    organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
    membership: {
      id: 'a1b2c3d4-1234-4567-8abc-123456789abc',
      userId,
      organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    permissions,
  });

  describe('requirePermission', () => {
    it('should allow when user has the required permission', () => {
      const policy = requirePermission('todos:create');
      const orgContext = createMockOrgContext(['todos:create', 'todos:read']);

      const result = policy(orgContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny when user lacks the required permission', () => {
      const policy = requirePermission('todos:delete');
      const orgContext = createMockOrgContext(['todos:create', 'todos:read']);

      const result = policy(orgContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.code).toBe('MISSING_PERMISSION');
        if (error.code === 'MISSING_PERMISSION') {
          expect(error.required).toBe('todos:delete');
          expect(error.available).toEqual(['todos:create', 'todos:read']);
        }
      }
    });
  });

  describe('requireAnyPermission', () => {
    it('should allow when user has one of the required permissions', () => {
      const policy = requireAnyPermission('todos:create', 'todos:delete');
      const orgContext = createMockOrgContext(['todos:create', 'todos:read']);

      const result = policy(orgContext);

      expect(result.isOk()).toBe(true);
    });

    it('should allow when user has multiple required permissions', () => {
      const policy = requireAnyPermission('todos:create', 'todos:read');
      const orgContext = createMockOrgContext([
        'todos:create',
        'todos:read',
        'todos:update',
      ]);

      const result = policy(orgContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny when user has none of the required permissions', () => {
      const policy = requireAnyPermission('todos:delete', 'org:delete');
      const orgContext = createMockOrgContext(['todos:create', 'todos:read']);

      const result = policy(orgContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.code).toBe('MISSING_PERMISSION');
        if (error.code === 'MISSING_PERMISSION') {
          expect(error.required).toBe('todos:delete');
        }
      }
    });
  });

  describe('requireAllPermissions', () => {
    it('should allow when user has all required permissions', () => {
      const policy = requireAllPermissions('todos:create', 'todos:read');
      const orgContext = createMockOrgContext([
        'todos:create',
        'todos:read',
        'todos:update',
      ]);

      const result = policy(orgContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny when user is missing one permission', () => {
      const policy = requireAllPermissions(
        'todos:create',
        'todos:read',
        'todos:delete',
      );
      const orgContext = createMockOrgContext(['todos:create', 'todos:read']);

      const result = policy(orgContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.code).toBe('MISSING_PERMISSION');
        if (error.code === 'MISSING_PERMISSION') {
          expect(error.required).toBe('todos:delete');
        }
      }
    });

    it('should deny when user is missing all permissions', () => {
      const policy = requireAllPermissions('todos:delete', 'org:delete');
      const orgContext = createMockOrgContext(['todos:create', 'todos:read']);

      const result = policy(orgContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_PERMISSION');
      }
    });
  });

  describe('requireCreatorOrPermission', () => {
    it('should allow when user is the creator (without permission)', () => {
      const policy = requireCreatorOrPermission('todos:complete');
      const orgContext = createMockOrgContext(['todos:read'], 'user-123');
      const resourceContext = { createdBy: 'user-123' };

      const result = policy(orgContext, resourceContext);

      expect(result.isOk()).toBe(true);
    });

    it('should allow when user has permission (not creator)', () => {
      const policy = requireCreatorOrPermission('todos:complete');
      const orgContext = createMockOrgContext(
        ['todos:complete', 'todos:read'],
        'user-123',
      );
      const resourceContext = { createdBy: 'user-456' };

      const result = policy(orgContext, resourceContext);

      expect(result.isOk()).toBe(true);
    });

    it('should allow when user is creator AND has permission', () => {
      const policy = requireCreatorOrPermission('todos:complete');
      const orgContext = createMockOrgContext(
        ['todos:complete', 'todos:read'],
        'user-123',
      );
      const resourceContext = { createdBy: 'user-123' };

      const result = policy(orgContext, resourceContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny when user is neither creator nor has permission', () => {
      const policy = requireCreatorOrPermission('todos:complete');
      const orgContext = createMockOrgContext(['todos:read'], 'user-123');
      const resourceContext = { createdBy: 'user-456' };

      const result = policy(orgContext, resourceContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_PERMISSION');
      }
    });

    it('should deny when resource context is missing', () => {
      const policy = requireCreatorOrPermission('todos:complete');
      const orgContext = createMockOrgContext(['todos:read'], 'user-123');

      const result = policy(orgContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_PERMISSION');
      }
    });
  });

  describe('custom', () => {
    it('should allow when evaluator returns true', () => {
      const policy = custom(
        (orgContext) => orgContext.membership.role === 'member',
        'Must be a member',
      );
      const orgContext = createMockOrgContext(['todos:read']);

      const result = policy(orgContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny when evaluator returns false', () => {
      const policy = custom(
        (orgContext) => orgContext.membership.role === 'owner',
        'Must be an owner',
      );
      const orgContext = createMockOrgContext(['todos:read']);

      const result = policy(orgContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.code).toBe('FORBIDDEN');
        if (error.code === 'FORBIDDEN') {
          expect(error.message).toBe('Must be an owner');
        }
      }
    });

    it('should allow with resource context when evaluator returns true', () => {
      const policy = custom(
        (
          _orgContext,
          resourceContext,
        ): resourceContext is { priority: string } =>
          typeof resourceContext === 'object' &&
          resourceContext !== null &&
          'priority' in resourceContext &&
          (resourceContext as { priority: string }).priority === 'high',
        'Only for high priority items',
      );
      const orgContext = createMockOrgContext(['todos:read']);
      const resourceContext = { priority: 'high' };

      const result = policy(orgContext, resourceContext);

      expect(result.isOk()).toBe(true);
    });

    it('should deny with resource context when evaluator returns false', () => {
      const policy = custom(
        (
          _orgContext,
          resourceContext,
        ): resourceContext is { priority: string } =>
          typeof resourceContext === 'object' &&
          resourceContext !== null &&
          'priority' in resourceContext &&
          (resourceContext as { priority: string }).priority === 'high',
        'Only for high priority items',
      );
      const orgContext = createMockOrgContext(['todos:read']);
      const resourceContext = { priority: 'low' };

      const result = policy(orgContext, resourceContext);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.error;
        expect(error.code).toBe('FORBIDDEN');
        if (error.code === 'FORBIDDEN') {
          expect(error.message).toBe('Only for high priority items');
        }
      }
    });
  });
});
