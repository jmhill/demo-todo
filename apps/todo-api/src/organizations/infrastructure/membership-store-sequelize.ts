import type { Sequelize, Model } from 'sequelize';
import type { OrganizationMembershipStore } from '../domain/organization-service.js';
import type { OrganizationMembership } from '../domain/organization-schemas.js';
import {
  defineMembershipModel,
  MembershipModelAttributesSchema,
} from '../../database/models/membership-model.js';
import {
  defineUserModel,
  UserModelAttributesSchema,
} from '../../database/models/user-model.js';
import {
  defineOrganizationModel,
  OrganizationModelAttributesSchema,
} from '../../database/models/organization-model.js';

export function createSequelizeMembershipStore(
  sequelize: Sequelize,
): OrganizationMembershipStore {
  const MembershipModel = defineMembershipModel(sequelize);
  const UserModel = defineUserModel(sequelize);
  const OrganizationModel = defineOrganizationModel(sequelize);

  // Helper to get UUID from integer ID (works for both users and orgs)
  const getUserUuid = async (userId: number): Promise<string> => {
    const user = await UserModel.findByPk(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    return UserModelAttributesSchema.parse(user.get({ plain: true })).uuid;
  };

  const getOrganizationUuid = async (orgId: number): Promise<string> => {
    const org = await OrganizationModel.findByPk(orgId);
    if (!org) {
      throw new Error(`Organization with id ${orgId} not found`);
    }
    return OrganizationModelAttributesSchema.parse(org.get({ plain: true }))
      .uuid;
  };

  // Helper to get integer ID from UUID
  const getUserId = async (userUuid: string): Promise<number> => {
    const user = await UserModel.findOne({ where: { uuid: userUuid } });
    if (!user) {
      throw new Error(`User with uuid ${userUuid} not found`);
    }
    return UserModelAttributesSchema.parse(user.get({ plain: true })).id!;
  };

  const getOrganizationId = async (orgUuid: string): Promise<number> => {
    const org = await OrganizationModel.findOne({ where: { uuid: orgUuid } });
    if (!org) {
      throw new Error(`Organization with uuid ${orgUuid} not found`);
    }
    return OrganizationModelAttributesSchema.parse(org.get({ plain: true }))
      .id!;
  };

  const toMembership = async (
    model: Model,
  ): Promise<OrganizationMembership> => {
    const data = MembershipModelAttributesSchema.parse(
      model.get({ plain: true }),
    );
    const userUuid = await getUserUuid(data.userId);
    const orgUuid = await getOrganizationUuid(data.organizationId);

    return {
      id: data.uuid, // Map database uuid column to domain id
      userId: userUuid,
      organizationId: orgUuid,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  };

  return {
    async save(membership: OrganizationMembership): Promise<void> {
      const userId = await getUserId(membership.userId);
      const organizationId = await getOrganizationId(membership.organizationId);

      await MembershipModel.create({
        uuid: membership.id, // Map domain id to database uuid column
        userId,
        organizationId,
        role: membership.role,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      });
    },

    async findById(id: string): Promise<OrganizationMembership | null> {
      // Search by uuid column instead of integer PK
      const model = await MembershipModel.findOne({ where: { uuid: id } });
      return model ? await toMembership(model) : null;
    },

    async findByUserAndOrg(options: {
      userId: string;
      organizationId: string;
    }): Promise<OrganizationMembership | null> {
      const userId = await getUserId(options.userId);
      const organizationId = await getOrganizationId(options.organizationId);

      const model = await MembershipModel.findOne({
        where: {
          userId,
          organizationId,
        },
      });
      return model ? await toMembership(model) : null;
    },

    async findByOrganizationId(
      orgId: string,
    ): Promise<OrganizationMembership[]> {
      // Check if org exists, return empty array if not
      const org = await OrganizationModel.findOne({ where: { uuid: orgId } });
      if (!org) {
        return [];
      }

      const organizationId = OrganizationModelAttributesSchema.parse(
        org.get({ plain: true }),
      ).id!;
      const models = await MembershipModel.findAll({
        where: {
          organizationId,
        },
      });
      return Promise.all(models.map((m) => toMembership(m)));
    },

    async findByUserId(userId: string): Promise<OrganizationMembership[]> {
      // Check if user exists, return empty array if not
      const user = await UserModel.findOne({ where: { uuid: userId } });
      if (!user) {
        return [];
      }

      const userIdInt = UserModelAttributesSchema.parse(
        user.get({ plain: true }),
      ).id!;
      const models = await MembershipModel.findAll({
        where: {
          userId: userIdInt,
        },
      });
      return Promise.all(models.map((m) => toMembership(m)));
    },

    async update(membership: OrganizationMembership): Promise<void> {
      await MembershipModel.update(
        {
          role: membership.role,
          updatedAt: membership.updatedAt,
        },
        {
          where: {
            uuid: membership.id, // Update by uuid column
          },
        },
      );
    },

    async delete(membershipId: string): Promise<void> {
      await MembershipModel.destroy({
        where: {
          uuid: membershipId, // Delete by uuid column
        },
      });
    },
  };
}
