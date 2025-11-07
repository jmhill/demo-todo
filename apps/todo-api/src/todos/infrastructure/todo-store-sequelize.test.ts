import { describe, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeTodoStore } from './todo-store-sequelize.js';
import { runTodoStoreContractTests } from './todo-store-contract-tests.js';
import type { Secret } from '../../config/secrets.js';

describe('SequelizeTodoStore', () => {
  let sequelize: Sequelize;

  // Helper to create test users (insert UUID, database generates integer PK)
  const createTestUser = async (userId: string) => {
    await sequelize.getQueryInterface().bulkInsert('users', [
      {
        uuid: userId, // Insert into uuid column, not id
        email: `user_${userId}@test.com`,
        username: `user_${userId}`,
        password_hash: 'test_hash',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  };

  // Helper to create test organizations (insert UUID, database generates integer PK)
  const createTestOrganization = async (orgId: string, name: string) => {
    await sequelize.getQueryInterface().bulkInsert('organizations', [
      {
        uuid: orgId, // Insert into uuid column, not id
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  };

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
  runTodoStoreContractTests({
    createStore: () => createSequelizeTodoStore(sequelize),
    setupDependencies: async ({ organizationId, organization2Id, userId }) => {
      // Create test user and organizations to satisfy foreign key constraints
      await createTestUser(userId);
      await createTestOrganization(organizationId, 'Test Org');
      if (organization2Id) {
        await createTestOrganization(organization2Id, 'Test Org 2');
      }
    },
    beforeEach: async () => {
      // Clean database before each test (order matters for foreign keys)
      await sequelize.getQueryInterface().bulkDelete('todos', {});
      await sequelize
        .getQueryInterface()
        .bulkDelete('organization_memberships', {});
      await sequelize.getQueryInterface().bulkDelete('organizations', {});
      await sequelize.getQueryInterface().bulkDelete('users', {});
    },
  });

  // Sequelize-specific tests can be added here if needed
  // Example: test foreign key constraints, database-specific edge cases, etc.
});
