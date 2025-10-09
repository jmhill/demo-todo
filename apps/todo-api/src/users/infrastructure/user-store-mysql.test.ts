import { describe, beforeAll } from 'vitest';
import mysql from 'mysql2/promise';
import { createMySQLUserStore, type MySQLConfig } from './user-store-mysql.js';
import { runUserStoreContractTests } from './user-store-contract-tests.js';

describe('MySQLUserStore', () => {
  let config: MySQLConfig;
  let cleanupConnection: mysql.Connection;

  beforeAll(async () => {
    // Use same TestContainer as Sequelize tests (started by global setup)
    const host = process.env.TEST_DB_HOST;
    const port = process.env.TEST_DB_PORT;
    const user = process.env.TEST_DB_USER;
    const password = process.env.TEST_DB_PASSWORD;
    const database = process.env.TEST_DB_DATABASE;

    if (!host || !port || !user || !password || !database) {
      throw new Error(
        'Database config not found in environment. ' +
          'Make sure tests are running with globalSetup configured.',
      );
    }

    config = {
      host,
      port: parseInt(port, 10),
      user,
      password,
      database,
    };

    // Create a dedicated connection for cleanup operations
    cleanupConnection = await mysql.createConnection(config);
  });

  // Run shared contract tests against MySQL implementation
  runUserStoreContractTests({
    createStore: () => createMySQLUserStore(config),
    beforeEach: async () => {
      // Clean database before each test using dedicated connection
      await cleanupConnection.execute('DELETE FROM users');
    },
  });

  // MySQL-specific tests can be added here if needed
  // Example: test connection pool behavior, raw SQL edge cases, etc.
});
