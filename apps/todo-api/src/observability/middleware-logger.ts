/**
 * HTTP Request/Response Logging Middleware
 *
 * Provides middleware to automatically log HTTP requests and responses.
 * Integrates with OpenTelemetry for trace correlation.
 *
 * Logs:
 * - Incoming requests (method, path, user context)
 * - Outgoing responses (status, duration)
 * - Request/response correlation via trace context
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

/**
 * Express middleware to log HTTP requests and responses
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Extract user context if available (set by auth middleware)
  const userId = req.auth?.user?.id;
  const organizationId = req.auth?.orgContext?.organizationId;

  // Log incoming request
  logger.info('HTTP request received', {
    event: 'http.request',
    method: req.method,
    path: req.path,
    userId,
    organizationId,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  // Capture the original res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const duration = Date.now() - startTime;

    logger.info('HTTP response sent', {
      event: 'http.response',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId,
      organizationId,
    });

    return originalJson(body);
  };

  next();
}

/**
 * Express error logging middleware
 */
export function errorLogger(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const userId = req.auth?.user?.id;
  const organizationId = req.auth?.orgContext?.organizationId;

  logger.error('HTTP request error', {
    event: 'http.error',
    method: req.method,
    path: req.path,
    userId,
    organizationId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
  });

  next(err);
}
