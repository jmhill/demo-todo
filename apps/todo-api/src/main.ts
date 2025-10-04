import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { filterSecrets } from './config/display.js';

// Load configuration
const config = loadConfig();

// Create app - all wiring happens inside createApp
export const app = createApp(config);

// Start server only if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(`Environment: ${config.environment}`);
    console.log(
      `Server running at http://${config.server.host}:${config.server.port}`,
    );
    console.log(
      `Health check available at http://${config.server.host}:${config.server.port}/health`,
    );
    if (config.docSite.enabled) {
      console.log(
        `API docs available at http://${config.server.host}:${config.server.port}/docs`,
      );
    }

    // Print effective configuration if requested
    if (process.env.PRINT_CONFIG === 'true') {
      console.log('\nEffective Configuration:');
      console.log(JSON.stringify(filterSecrets(config), null, 2));
    }
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
