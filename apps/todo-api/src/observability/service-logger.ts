/**
 * Service Call Logging Utilities
 *
 * Provides utilities to automatically log service calls at application layer.
 * This maintains hexagonal architecture by keeping telemetry out of domain.
 *
 * Usage in routers:
 *   const result = await logServiceCall('createTodo', () =>
 *     todoService.createTodo({ organizationId, createdBy, title })
 *   );
 *
 * Automatically logs:
 * - Operation name and start time
 * - Success with result summary
 * - Errors with error codes and details
 * - Duration
 */

import { logger } from './logger.js';
import type { Result, ResultAsync } from 'neverthrow';

type ServiceCallMetadata = {
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
};

/**
 * Log a synchronous service call that returns Result<T, E>
 */
export async function logServiceCall<T, E extends { code?: string }>(
  operationName: string,
  serviceCall: () => Result<T, E> | ResultAsync<T, E>,
  metadata?: ServiceCallMetadata,
): Promise<Result<T, E>> {
  const startTime = Date.now();

  logger.info(`Service call started: ${operationName}`, {
    operation: operationName,
    ...metadata,
  });

  const result = await serviceCall();

  const duration = Date.now() - startTime;

  if (result.isOk()) {
    logger.info(`Service call succeeded: ${operationName}`, {
      operation: operationName,
      duration,
      success: true,
      ...metadata,
    });
  } else {
    const error = result.error;
    logger.error(`Service call failed: ${operationName}`, {
      operation: operationName,
      duration,
      success: false,
      errorCode: error.code || 'UNKNOWN',
      errorMessage:
        error && typeof error === 'object' && 'message' in error
          ? error.message
          : 'Unknown error',
      ...metadata,
    });
  }

  return result;
}

/**
 * Log a void service call (operations that don't return results)
 */
export async function logVoidServiceCall(
  operationName: string,
  serviceCall: () => Promise<void>,
  metadata?: ServiceCallMetadata,
): Promise<void> {
  const startTime = Date.now();

  logger.info(`Service call started: ${operationName}`, {
    operation: operationName,
    ...metadata,
  });

  try {
    await serviceCall();

    const duration = Date.now() - startTime;
    logger.info(`Service call succeeded: ${operationName}`, {
      operation: operationName,
      duration,
      success: true,
      ...metadata,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Service call failed: ${operationName}`, {
      operation: operationName,
      duration,
      success: false,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      ...metadata,
    });
    throw error;
  }
}
