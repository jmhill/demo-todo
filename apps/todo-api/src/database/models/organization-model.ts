import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';
import { z } from 'zod';

// Zod schema for runtime validation
export const OrganizationModelAttributesSchema = z.object({
  id: z.number().optional(),
  uuid: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Database model attributes (internal representation with integer PK and UUID)
export type OrganizationModelAttributes = z.infer<
  typeof OrganizationModelAttributesSchema
>;

export type OrganizationModel = Model<OrganizationModelAttributes>;

export function defineOrganizationModel(
  sequelize: Sequelize,
): ModelCtor<OrganizationModel> {
  return sequelize.define(
    'Organization',
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      uuid: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: true,
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
          fields: ['uuid'],
        },
        {
          unique: true,
          fields: ['slug'],
        },
      ],
    },
  );
}
