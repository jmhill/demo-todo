import type { Sequelize, Model } from 'sequelize';
import type { OrganizationStore } from '../domain/organization-service.js';
import type { Organization } from '../domain/organization-schemas.js';
import {
  defineOrganizationModel,
  OrganizationModelAttributesSchema,
} from '../../database/models/organization-model.js';

export function createSequelizeOrganizationStore(
  sequelize: Sequelize,
): OrganizationStore {
  const OrganizationModel = defineOrganizationModel(sequelize);

  const toOrganization = (model: Model): Organization => {
    const data = OrganizationModelAttributesSchema.parse(
      model.get({ plain: true }),
    );
    return {
      id: data.uuid, // Map database uuid column to domain id
      name: data.name,
      slug: data.slug,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  };

  return {
    async save(org: Organization): Promise<void> {
      await OrganizationModel.create({
        uuid: org.id, // Map domain id to database uuid column
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      });
    },

    async findById(id: string): Promise<Organization | null> {
      // Search by uuid column instead of integer PK
      const model = await OrganizationModel.findOne({ where: { uuid: id } });
      return model ? toOrganization(model) : null;
    },

    async findBySlug(slug: string): Promise<Organization | null> {
      const model = await OrganizationModel.findOne({
        where: {
          slug,
        },
      });
      return model ? toOrganization(model) : null;
    },

    async update(org: Organization): Promise<void> {
      await OrganizationModel.update(
        {
          name: org.name,
          slug: org.slug,
          updatedAt: org.updatedAt,
        },
        {
          where: {
            uuid: org.id, // Update by uuid column
          },
        },
      );
    },
  };
}
