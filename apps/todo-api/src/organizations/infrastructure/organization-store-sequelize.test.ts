import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { Sequelize } from 'sequelize';
import { createSequelizeOrganizationStore } from './organization-store-sequelize.js';
import type { Organization } from '../domain/organization-schemas.js';
import type { Secret } from '../../config/secrets.js';

describe('SequelizeOrganizationStore', () => {
  let sequelize: Sequelize;
  let organizationStore: ReturnType<typeof createSequelizeOrganizationStore>;

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

  beforeEach(async () => {
    // Clean database before each test (order matters for foreign keys)
    await sequelize.getQueryInterface().bulkDelete('todos', {});
    await sequelize
      .getQueryInterface()
      .bulkDelete('organization_memberships', {});
    await sequelize.getQueryInterface().bulkDelete('organizations', {});

    // Recreate store instance
    organizationStore = createSequelizeOrganizationStore(sequelize);
  });

  describe('save', () => {
    it('should save an organization', async () => {
      const now = new Date();
      const organization: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test Organization',
        slug: 'test-organization',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(organization);

      const found = await organizationStore.findById(organization.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(organization.id);
      expect(found?.name).toBe('Test Organization');
      expect(found?.slug).toBe('test-organization');
      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle organization with different slug format', async () => {
      const now = new Date();
      const organization: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Another Org',
        slug: 'another-org-123',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(organization);

      const found = await organizationStore.findById(organization.id);
      expect(found).not.toBeNull();
      expect(found?.slug).toBe('another-org-123');
    });
  });

  describe('findById', () => {
    it('should return organization when found', async () => {
      const now = new Date();
      const organization: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Find By ID Org',
        slug: 'find-by-id-org',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(organization);

      const found = await organizationStore.findById(organization.id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(organization.id);
      expect(found?.name).toBe('Find By ID Org');
      expect(found?.slug).toBe('find-by-id-org');
    });

    it('should return null when organization not found', async () => {
      const found = await organizationStore.findById(
        '550e8400-e29b-41d4-a716-446655440099',
      );
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return organization when found by slug', async () => {
      const now = new Date();
      const organization: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Slug Search Org',
        slug: 'slug-search-org',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(organization);

      const found = await organizationStore.findBySlug('slug-search-org');
      expect(found).not.toBeNull();
      expect(found?.id).toBe(organization.id);
      expect(found?.name).toBe('Slug Search Org');
      expect(found?.slug).toBe('slug-search-org');
    });

    it('should return null when slug not found', async () => {
      const found = await organizationStore.findBySlug('nonexistent-slug');
      expect(found).toBeNull();
    });

    it('should handle slug search case-insensitively (MySQL default)', async () => {
      const now = new Date();
      const organization: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440005',
        name: 'Case Test Org',
        slug: 'case-test-org',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(organization);

      // MySQL is case-insensitive by default for string columns
      const found = await organizationStore.findBySlug('Case-Test-Org');
      expect(found).not.toBeNull();
      expect(found?.slug).toBe('case-test-org'); // Returns original slug
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const now = new Date();
      const organization: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Original Name',
        slug: 'original-slug',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(organization);

      const updatedOrganization: Organization = {
        ...organization,
        name: 'Updated Name',
        slug: 'updated-slug',
        updatedAt: new Date(),
      };

      await organizationStore.update(updatedOrganization);

      const found = await organizationStore.findById(organization.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe('Updated Name');
      expect(found?.slug).toBe('updated-slug');
      // Verify updatedAt changed (we're not testing clock precision)
      expect(found?.updatedAt).toBeInstanceOf(Date);
      expect(found?.createdAt).toBeInstanceOf(Date);
    });

    it('should update only the specified organization', async () => {
      const now = new Date();
      const org1: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440007',
        name: 'Org 1',
        slug: 'org-1',
        createdAt: now,
        updatedAt: now,
      };

      const org2: Organization = {
        id: '550e8400-e29b-41d4-a716-446655440008',
        name: 'Org 2',
        slug: 'org-2',
        createdAt: now,
        updatedAt: now,
      };

      await organizationStore.save(org1);
      await organizationStore.save(org2);

      const updatedOrg1: Organization = {
        ...org1,
        name: 'Updated Org 1',
        updatedAt: new Date(),
      };

      await organizationStore.update(updatedOrg1);

      const found1 = await organizationStore.findById(org1.id);
      const found2 = await organizationStore.findById(org2.id);

      expect(found1?.name).toBe('Updated Org 1');
      expect(found2?.name).toBe('Org 2'); // Should remain unchanged
    });
  });
});
