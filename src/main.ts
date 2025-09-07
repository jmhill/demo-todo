import { createApp } from './app.js';
import { loadConfig } from './config/index.js';

// Load configuration and create app
const config = await loadConfig();
export const app = createApp(config);

// Start server only if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(config.server.port, config.server.host, () => {
    console.log(
      `Server running at http://${config.server.host}:${config.server.port}`,
    );
    console.log(
      `Health check available at http://${config.server.host}:${config.server.port}/health`,
    );
    console.log(`Environment: ${config.environment}`);
  });
}
