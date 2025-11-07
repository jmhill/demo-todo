import {
  DataTypes,
  type Sequelize,
  type ModelStatic,
  type Model,
} from 'sequelize';
import { z } from 'zod';

// Zod schema for runtime validation
export const UserModelAttributesSchema = z.object({
  id: z.number().optional(),
  uuid: z.string().uuid(),
  email: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Database model attributes (internal representation with integer PK and UUID)
export type UserModelAttributes = z.infer<typeof UserModelAttributesSchema>;

export type UserModel = Model<UserModelAttributes>;

export function defineUserModel(sequelize: Sequelize): ModelStatic<UserModel> {
  return sequelize.define(
    'User',
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash',
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
      tableName: 'users',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['uuid'],
        },
        {
          unique: true,
          fields: ['email'],
        },
        {
          unique: true,
          fields: ['username'],
        },
      ],
    },
  );
}
