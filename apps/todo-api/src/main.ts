import { createApp } from './app.js';
import { loadConfig } from './config/index.js';
import { filterSecrets } from './config/display.js';
import { createMySQLUserStore } from './users/user-store-mysql.js';
import { createUserService } from './users/user-service.js';

// Load configuration
const config = loadConfig();

// Bootstrap dependencies
const userStore = await createMySQLUserStore(config.database);

// Bootstrap services
const userService = createUserService(userStore);

// Create app with explicit dependencies
export const app = createApp(config, { userStore }, { userService });

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

    // Print effective configuration if requested
    if (process.env.PRINT_CONFIG === 'true') {
      console.log('\nEffective Configuration:');
      console.log(JSON.stringify(filterSecrets(config), null, 2));
    }
  });
}
