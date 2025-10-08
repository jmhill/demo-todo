import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';
import type { OrganizationMembership } from '../../organizations/domain/organization-schemas.js';

export type MembershipModelAttributes = OrganizationMembership;

export type MembershipModel = Model<MembershipModelAttributes>;

export function defineMembershipModel(
  sequelize: Sequelize,
): ModelCtor<MembershipModel> {
  return sequelize.define(
    'OrganizationMembership',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'organization_id',
      },
      role: {
        type: DataTypes.ENUM('owner', 'admin', 'member', 'viewer'),
        allowNull: false,
        defaultValue: 'member',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      tableName: 'organization_memberships',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'organization_id'],
          name: 'unique_user_org',
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['organization_id'],
        },
      ],
    },
  );
}
