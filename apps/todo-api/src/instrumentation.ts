/**
 * OpenTelemetry Instrumentation Setup
 *
 * IMPORTANT: This module MUST be imported first in the application entry point.
 * It initializes the OpenTelemetry SDK with auto-instrumentations for:
 * - Express (HTTP server)
 * - HTTP client requests
 * - MySQL2 database queries
 * - Winston logging (for trace correlation)
 *
 * The application exports telemetry data via OTLP to a collector, maintaining
 * vendor independence. The collector handles routing to observability backends.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

// Get OTLP endpoint from environment, fallback to localhost collector
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// Service identification
const serviceName = process.env.OTEL_SERVICE_NAME || 'demo-todo-api';
const serviceVersion = process.env.npm_package_version || '1.0.0';

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  }),

  // Trace exporter - sends traces to OTLP collector
  traceExporter: new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  }),

  // Metric exporter - sends metrics to OTLP collector
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
    }),
    exportIntervalMillis: 60000, // Export every 60 seconds
  }),

  // Auto-instrumentations for common libraries
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable fs instrumentation (too noisy)
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Express, HTTP, MySQL2, Winston are auto-instrumented
    }),
  ],
});

// Start the SDK
sdk.start();

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK', error);
  } finally {
    process.exit(0);
  }
});
