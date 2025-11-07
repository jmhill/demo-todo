import {
  DataTypes,
  type Sequelize,
  type ModelStatic,
  type Model,
} from 'sequelize';
import { z } from 'zod';

// Zod schema for runtime validation
export const MembershipModelAttributesSchema = z.object({
  id: z.number().optional(),
  uuid: z.string().uuid(),
  userId: z.number(),
  organizationId: z.number(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Database model attributes (internal representation with integer PK and FKs)
export type MembershipModelAttributes = z.infer<
  typeof MembershipModelAttributesSchema
>;

export type MembershipModel = Model<MembershipModelAttributes>;

export function defineMembershipModel(
  sequelize: Sequelize,
): ModelStatic<MembershipModel> {
  return sequelize.define(
    'OrganizationMembership',
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
      userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'user_id',
      },
      organizationId: {
        type: DataTypes.BIGINT,
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
          fields: ['uuid'],
        },
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
