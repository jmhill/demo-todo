import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';
import type { UserWithHashedPassword } from '../../users/user-schemas.js';

export type UserModelAttributes = UserWithHashedPassword;

export type UserModel = Model<UserModelAttributes>;

export function defineUserModel(sequelize: Sequelize): ModelCtor<UserModel> {
  return sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
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
