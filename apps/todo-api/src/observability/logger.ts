/**
 * Winston Logger Factory with OpenTelemetry Integration
 *
 * Creates a structured logger that automatically correlates logs with traces.
 * The WinstonInstrumentation automatically injects trace_id and span_id into
 * every log entry when a trace context is active.
 *
 * This enables:
 * - Clicking a log in SigNoz to jump to its trace
 * - Viewing all logs from a specific trace span
 * - Distributed context correlation across services
 */

import winston from 'winston';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

// Initialize Winston instrumentation for automatic trace correlation
new WinstonInstrumentation();

/**
 * Create application logger with structured JSON output
 */
export const createLogger = () => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: {
      service: process.env.OTEL_SERVICE_NAME || 'demo-todo-api',
    },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length
              ? JSON.stringify(meta, null, 2)
              : '';
            return `${timestamp} [${level}] ${message} ${metaStr}`;
          }),
        ),
      }),
    ],
  });
};

// Export singleton logger instance
export const logger = createLogger();
