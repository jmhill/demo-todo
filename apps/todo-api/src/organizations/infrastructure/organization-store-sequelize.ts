import type { Sequelize, Model } from 'sequelize';
import type { OrganizationStore } from '../domain/organization-service.js';
import type { Organization } from '../domain/organization-schemas.js';
import { defineOrganizationModel } from '../../database/models/organization-model.js';

export function createSequelizeOrganizationStore(
  sequelize: Sequelize,
): OrganizationStore {
  const OrganizationModel = defineOrganizationModel(sequelize);

  const toOrganization = (model: Model): Organization => {
    const data = model.get({ plain: true }) as Organization;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  };

  return {
    async save(org: Organization): Promise<void> {
      await OrganizationModel.create({
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      });
    },

    async findById(id: string): Promise<Organization | null> {
      const model = await OrganizationModel.findByPk(id);
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
            id: org.id,
          },
        },
      );
    },
  };
}
