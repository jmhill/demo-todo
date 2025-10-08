import type { Sequelize, Model } from 'sequelize';
import type { OrganizationMembershipStore } from '../domain/organization-service.js';
import type { OrganizationMembership } from '../domain/organization-schemas.js';
import { defineMembershipModel } from '../../database/models/membership-model.js';

export function createSequelizeMembershipStore(
  sequelize: Sequelize,
): OrganizationMembershipStore {
  const MembershipModel = defineMembershipModel(sequelize);

  const toMembership = (model: Model): OrganizationMembership => {
    const data = model.get({ plain: true }) as OrganizationMembership;
    return {
      id: data.id,
      userId: data.userId,
      organizationId: data.organizationId,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  };

  return {
    async save(membership: OrganizationMembership): Promise<void> {
      await MembershipModel.create({
        id: membership.id,
        userId: membership.userId,
        organizationId: membership.organizationId,
        role: membership.role,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      });
    },

    async findById(id: string): Promise<OrganizationMembership | null> {
      const model = await MembershipModel.findByPk(id);
      return model ? toMembership(model) : null;
    },

    async findByUserAndOrg(options: {
      userId: string;
      organizationId: string;
    }): Promise<OrganizationMembership | null> {
      const model = await MembershipModel.findOne({
        where: {
          userId: options.userId,
          organizationId: options.organizationId,
        },
      });
      return model ? toMembership(model) : null;
    },

    async findByOrganizationId(
      orgId: string,
    ): Promise<OrganizationMembership[]> {
      const models = await MembershipModel.findAll({
        where: {
          organizationId: orgId,
        },
      });
      return models.map(toMembership);
    },

    async findByUserId(userId: string): Promise<OrganizationMembership[]> {
      const models = await MembershipModel.findAll({
        where: {
          userId,
        },
      });
      return models.map(toMembership);
    },

    async update(membership: OrganizationMembership): Promise<void> {
      await MembershipModel.update(
        {
          role: membership.role,
          updatedAt: membership.updatedAt,
        },
        {
          where: {
            id: membership.id,
          },
        },
      );
    },

    async delete(membershipId: string): Promise<void> {
      await MembershipModel.destroy({
        where: {
          id: membershipId,
        },
      });
    },
  };
}
