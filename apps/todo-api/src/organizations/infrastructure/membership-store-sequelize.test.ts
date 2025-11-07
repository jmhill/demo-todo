import { describe, it, expect, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeMembershipStore } from './membership-store-sequelize.js';
import { runMembershipStoreContractTests } from './membership-store-contract-tests.js';
import type { OrganizationMembership } from '../domain/organization-schemas.js';
import type { Secret } from '../../config/secrets.js';

describe('SequelizeMembershipStore', () => {
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
  runMembershipStoreContractTests({
    createStore: () => createSequelizeMembershipStore(sequelize),
    setupDependencies: async ({
      userId,
      user2Id,
      organizationId,
      organization2Id,
    }) => {
      // Create test users and organizations to satisfy foreign key constraints
      if (userId) await createTestUser(userId);
      if (user2Id) await createTestUser(user2Id);
      if (organizationId)
        await createTestOrganization(organizationId, 'Test Org');
      if (organization2Id)
        await createTestOrganization(organization2Id, 'Test Org 2');
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

  // Sequelize-specific tests
  describe('Sequelize-specific constraints', () => {
    it('should enforce unique constraint on user-org combination', async () => {
      const membershipStore = createSequelizeMembershipStore(sequelize);
      const userId = '550e8400-e29b-41d4-a716-446655440015';
      const orgId = '550e8400-e29b-41d4-a716-446655440016';

      // Clean and set up dependencies
      await sequelize
        .getQueryInterface()
        .bulkDelete('organization_memberships', {});
      await sequelize.getQueryInterface().bulkDelete('organizations', {});
      await sequelize.getQueryInterface().bulkDelete('users', {});
      await createTestUser(userId);
      await createTestOrganization(orgId, 'Test Org');

      const now = new Date();
      const membership1: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440017',
        userId,
        organizationId: orgId,
        role: 'member',
        createdAt: now,
        updatedAt: now,
      };

      await membershipStore.save(membership1);

      // Try to save duplicate membership
      const membership2: OrganizationMembership = {
        id: '550e8400-e29b-41d4-a716-446655440018',
        userId,
        organizationId: orgId,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      };

      await expect(membershipStore.save(membership2)).rejects.toThrow();
    });
  });
});
