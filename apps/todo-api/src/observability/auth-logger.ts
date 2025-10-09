/**
 * Authorization Logging Utilities
 *
 * Provides logging utilities for authentication and authorization checks.
 * Used by auth middleware to automatically log security-relevant events.
 *
 * Logs:
 * - Authentication attempts (success/failure)
 * - Permission checks (granted/denied)
 * - Policy evaluations
 * - Organization membership resolution
 */

import { logger } from './logger.js';
import type { Permission } from '../auth/domain/authorization-schemas.js';

/**
 * Log authentication attempt
 */
export function logAuthAttempt(options: {
  usernameOrEmail: string;
  success: boolean;
  userId?: string;
  reason?: string;
}): void {
  const { usernameOrEmail, success, userId, reason } = options;

  if (success) {
    logger.info('Authentication succeeded', {
      event: 'auth.success',
      usernameOrEmail,
      userId,
    });
  } else {
    logger.warn('Authentication failed', {
      event: 'auth.failed',
      usernameOrEmail,
      reason: reason || 'Invalid credentials',
    });
  }
}

/**
 * Log permission check
 */
export function logPermissionCheck(options: {
  userId: string;
  organizationId: string;
  requiredPermission: Permission | Permission[];
  granted: boolean;
  userPermissions?: Permission[];
}): void {
  const {
    userId,
    organizationId,
    requiredPermission,
    granted,
    userPermissions,
  } = options;

  if (granted) {
    logger.info('Permission check granted', {
      event: 'authz.permission.granted',
      userId,
      organizationId,
      requiredPermission,
    });
  } else {
    logger.warn('Permission check denied', {
      event: 'authz.permission.denied',
      userId,
      organizationId,
      requiredPermission,
      userPermissions,
    });
  }
}

/**
 * Log organization membership resolution
 */
export function logOrgMembership(options: {
  userId: string;
  organizationId: string;
  role: string;
  permissions: Permission[];
}): void {
  const { userId, organizationId, role, permissions } = options;

  logger.info('Organization membership resolved', {
    event: 'authz.membership.resolved',
    userId,
    organizationId,
    role,
    permissionCount: permissions.length,
  });
}

/**
 * Log policy evaluation
 */
export function logPolicyEvaluation(options: {
  policyName: string;
  userId: string;
  organizationId: string;
  allowed: boolean;
  reason?: string;
}): void {
  const { policyName, userId, organizationId, allowed, reason } = options;

  if (allowed) {
    logger.info('Policy evaluation allowed', {
      event: 'authz.policy.allowed',
      policyName,
      userId,
      organizationId,
    });
  } else {
    logger.warn('Policy evaluation denied', {
      event: 'authz.policy.denied',
      policyName,
      userId,
      organizationId,
      reason: reason || 'Policy conditions not met',
    });
  }
}
