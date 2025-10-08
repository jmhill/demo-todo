import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';
import type { Organization } from '../../organizations/domain/organization-schemas.js';

export type OrganizationModelAttributes = Organization;

export type OrganizationModel = Model<OrganizationModelAttributes>;

export function defineOrganizationModel(
  sequelize: Sequelize,
): ModelCtor<OrganizationModel> {
  return sequelize.define(
    'Organization',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
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
      tableName: 'organizations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['slug'],
        },
      ],
    },
  );
}
