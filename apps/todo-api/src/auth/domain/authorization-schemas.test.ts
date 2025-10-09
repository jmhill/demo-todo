import { describe, it, expect } from 'vitest';
import {
  getPermissionsForRole,
  PermissionSchema,
  OrgContextSchema,
  AuthorizationErrorSchema,
  type Permission,
} from './authorization-schemas.js';

describe('Authorization Schemas', () => {
  describe('getPermissionsForRole', () => {
    it('should return all permissions for owner role', () => {
      const permissions = getPermissionsForRole('owner');

      expect(permissions).toContain('todos:create');
      expect(permissions).toContain('todos:read');
      expect(permissions).toContain('todos:update');
      expect(permissions).toContain('todos:delete');
      expect(permissions).toContain('todos:complete');
      expect(permissions).toContain('org:members:read');
      expect(permissions).toContain('org:members:invite');
      expect(permissions).toContain('org:members:remove');
      expect(permissions).toContain('org:members:update-role');
      expect(permissions).toContain('org:settings:read');
      expect(permissions).toContain('org:settings:update');
      expect(permissions).toContain('org:delete');
    });

    it('should return admin permissions (no org:delete)', () => {
      const permissions = getPermissionsForRole('admin');

      expect(permissions).toContain('todos:create');
      expect(permissions).toContain('todos:read');
      expect(permissions).toContain('todos:update');
      expect(permissions).toContain('todos:delete');
      expect(permissions).toContain('todos:complete');
      expect(permissions).toContain('org:members:read');
      expect(permissions).toContain('org:members:invite');
      expect(permissions).toContain('org:members:remove');
      expect(permissions).toContain('org:settings:read');
      expect(permissions).not.toContain('org:delete');
      expect(permissions).not.toContain('org:members:update-role');
    });

    it('should return member permissions (create and manage own todos)', () => {
      const permissions = getPermissionsForRole('member');

      expect(permissions).toContain('todos:create');
      expect(permissions).toContain('todos:read');
      expect(permissions).toContain('todos:update');
      expect(permissions).toContain('todos:complete');
      expect(permissions).toContain('org:members:read');
      expect(permissions).not.toContain('todos:delete');
      expect(permissions).not.toContain('org:members:invite');
      expect(permissions).not.toContain('org:delete');
    });

    it('should return viewer permissions (read-only)', () => {
      const permissions = getPermissionsForRole('viewer');

      expect(permissions).toContain('todos:read');
      expect(permissions).toContain('org:members:read');
      expect(permissions).toContain('org:settings:read');
      expect(permissions).not.toContain('todos:create');
      expect(permissions).not.toContain('todos:update');
      expect(permissions).not.toContain('todos:delete');
    });
  });

  describe('PermissionSchema', () => {
    it('should validate valid permissions', () => {
      const validPermissions: Permission[] = [
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
      ];

      validPermissions.forEach((permission) => {
        const result = PermissionSchema.safeParse(permission);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid permissions', () => {
      const result = PermissionSchema.safeParse('invalid:permission');
      expect(result.success).toBe(false);
    });
  });

  describe('OrgContextSchema', () => {
    it('should validate a valid organization context', () => {
      const validContext = {
        organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
        membership: {
          id: 'a1b2c3d4-1234-4567-8abc-123456789abc',
          userId: 'e5f6a7b8-1234-4567-8abc-123456789abc',
          organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        permissions: ['todos:create', 'todos:read'],
      };

      const result = OrgContextSchema.safeParse(validContext);
      expect(result.success).toBe(true);
    });

    it('should reject context with invalid organizationId', () => {
      const invalidContext = {
        organizationId: 'not-a-uuid',
        membership: {
          id: 'a1b2c3d4-1234-4567-8abc-123456789abc',
          userId: 'e5f6a7b8-1234-4567-8abc-123456789abc',
          organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        permissions: ['todos:create'],
      };

      const result = OrgContextSchema.safeParse(invalidContext);
      expect(result.success).toBe(false);
    });

    it('should reject context with invalid permissions', () => {
      const invalidContext = {
        organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
        membership: {
          id: 'a1b2c3d4-1234-4567-8abc-123456789abc',
          userId: 'e5f6a7b8-1234-4567-8abc-123456789abc',
          organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        permissions: ['invalid:permission'],
      };

      const result = OrgContextSchema.safeParse(invalidContext);
      expect(result.success).toBe(false);
    });
  });

  describe('AuthorizationErrorSchema', () => {
    it('should validate NOT_MEMBER error', () => {
      const error = {
        code: 'NOT_MEMBER',
        organizationId: 'b4c7a8e1-1234-4567-8abc-123456789abc',
      };

      const result = AuthorizationErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('should validate MISSING_PERMISSION error', () => {
      const error = {
        code: 'MISSING_PERMISSION',
        required: 'todos:delete',
        available: ['todos:create', 'todos:read'],
      };

      const result = AuthorizationErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('should validate FORBIDDEN error', () => {
      const error = {
        code: 'FORBIDDEN',
        message: 'Access denied',
      };

      const result = AuthorizationErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('should reject error with invalid code', () => {
      const error = {
        code: 'INVALID_CODE',
        message: 'Some error',
      };

      const result = AuthorizationErrorSchema.safeParse(error);
      expect(result.success).toBe(false);
    });
  });
});
