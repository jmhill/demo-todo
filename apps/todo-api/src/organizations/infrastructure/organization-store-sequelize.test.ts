import { describe, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeOrganizationStore } from './organization-store-sequelize.js';
import { runOrganizationStoreContractTests } from './organization-store-contract-tests.js';
import type { Secret } from '../../config/secrets.js';

describe('SequelizeOrganizationStore', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    // Connect to MySQL testcontainer (started by global setup)
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

    sequelize = new Sequelize({
      dialect: 'mysql',
      host,
      port: parseInt(port, 10),
      username: user,
      password: password as Secret,
      database,
      logging: false,
    });

    // Migrations already run by global setup
  });

  // Run shared contract tests against Sequelize implementation
  runOrganizationStoreContractTests({
    createStore: () => createSequelizeOrganizationStore(sequelize),
    beforeEach: async () => {
      // Clean database before each test (order matters for foreign keys)
      await sequelize.getQueryInterface().bulkDelete('todos', {});
      await sequelize
        .getQueryInterface()
        .bulkDelete('organization_memberships', {});
      await sequelize.getQueryInterface().bulkDelete('organizations', {});
    },
  });

  // Sequelize-specific tests can be added here if needed
  // Example: test database-specific edge cases, constraints, etc.
});
