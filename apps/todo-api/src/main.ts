// IMPORTANT: Import instrumentation FIRST for OpenTelemetry to work
import './instrumentation.js';

import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { filterSecrets } from './config/display.js';
import { logger } from './observability/index.js';

// Load configuration
const config = loadConfig();

// Create app - all wiring happens inside createApp
export const app = createApp(config);

// Start server only if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info('Server started', {
      event: 'server.started',
      environment: config.environment,
      host: config.server.host,
      port: config.server.port,
      healthCheckUrl: `http://${config.server.host}:${config.server.port}/health`,
      docsUrl: config.docSite.enabled
        ? `http://${config.server.host}:${config.server.port}/docs`
        : undefined,
    });

    // Print effective configuration if requested
    if (process.env.PRINT_CONFIG === 'true') {
      logger.info('Effective configuration', {
        config: filterSecrets(config),
      });
    }
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    logger.info('Server shutting down', {
      event: 'server.shutdown',
      signal,
    });

    server.close(() => {
      logger.info('Server closed', {
        event: 'server.closed',
      });
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
