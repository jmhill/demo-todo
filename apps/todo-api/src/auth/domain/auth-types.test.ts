import { describe, it, expect } from 'vitest';
import type { Request } from 'express';
import {
  extractAuthContext,
  extractOrgContext,
  extractAuthAndOrgContext,
} from './auth-types.js';
import type { User } from '../../users/domain/user-schemas.js';
import type { OrgContext } from './authorization-schemas.js';

describe('Auth Context Extraction', () => {
  describe('extractAuthContext', () => {
    it('should return error when auth is missing', () => {
      const req = {} as Request;

      const result = extractAuthContext(req);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_AUTH');
        expect(result.error.message).toBe('Authentication required');
      }
    });

    it('should return user and token when auth is present', () => {
      const user: User = {
        id: 'b4c7a8e1-1234-4567-8abc-123456789abc',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const req = {
        auth: {
          user,
          token: 'test-token-123',
        },
      } as Request;

      const result = extractAuthContext(req);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user).toEqual(user);
        expect(result.value.token).toBe('test-token-123');
      }
    });
  });

  describe('extractOrgContext', () => {
    it('should return error when auth is missing', () => {
      const req = {} as Request;

      const result = extractOrgContext(req);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_ORG_CONTEXT');
        expect(result.error.message).toBe('Organization context required');
      }
    });

    it('should return error when orgContext is missing', () => {
      const req = {
        auth: {
          user: {
            id: 'b4c7a8e1-1234-4567-8abc-123456789abc',
            email: 'test@example.com',
            username: 'testuser',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'test-token',
        },
      } as Request;

      const result = extractOrgContext(req);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_ORG_CONTEXT');
        expect(result.error.message).toBe('Organization context required');
      }
    });

    it('should return org context when present', () => {
      const orgContext: OrgContext = {
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

      const req = {
        auth: {
          user: {
            id: 'e5f6a7b8-1234-4567-8abc-123456789abc',
            email: 'test@example.com',
            username: 'testuser',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'test-token',
          orgContext,
        },
      } as Request;

      const result = extractOrgContext(req);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(orgContext);
      }
    });
  });

  describe('extractAuthAndOrgContext', () => {
    it('should return error when auth is missing', () => {
      const req = {} as Request;

      const result = extractAuthAndOrgContext(req);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_AUTH');
      }
    });

    it('should return error when orgContext is missing', () => {
      const req = {
        auth: {
          user: {
            id: 'b4c7a8e1-1234-4567-8abc-123456789abc',
            email: 'test@example.com',
            username: 'testuser',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          token: 'test-token',
        },
      } as Request;

      const result = extractAuthAndOrgContext(req);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('MISSING_ORG_CONTEXT');
      }
    });

    it('should return both auth and org context when both present', () => {
      const user: User = {
        id: 'e5f6a7b8-1234-4567-8abc-123456789abc',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const orgContext: OrgContext = {
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

      const req = {
        auth: {
          user,
          token: 'test-token-123',
          orgContext,
        },
      } as Request;

      const result = extractAuthAndOrgContext(req);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user).toEqual(user);
        expect(result.value.token).toBe('test-token-123');
        expect(result.value.orgContext).toEqual(orgContext);
      }
    });
  });
});
