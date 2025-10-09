/**
 * Observability Module
 *
 * Cross-cutting concern for logging, tracing, and metrics.
 * Lives in application layer, keeping domain pure.
 *
 * Exports:
 * - logger: Winston logger with OTEL trace correlation
 * - logServiceCall: Wrap service calls with automatic logging
 * - logAuthAttempt, logPermissionCheck, etc: Auth/authz logging
 * - requestLogger, errorLogger: HTTP middleware
 */

export { logger, createLogger } from './logger.js';
export { logServiceCall, logVoidServiceCall } from './service-logger.js';
export {
  logAuthAttempt,
  logPermissionCheck,
  logOrgMembership,
  logPolicyEvaluation,
} from './auth-logger.js';
export { requestLogger, errorLogger } from './middleware-logger.js';
