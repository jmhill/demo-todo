import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';

// Database model attributes (internal representation with integer PK and UUID)
export interface UserModelAttributes {
  id?: number; // Auto-increment BIGINT PK (optional for creation)
  uuid: string; // Public UUID identifier (CHAR(36))
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserModel = Model<UserModelAttributes>;

export function defineUserModel(sequelize: Sequelize): ModelCtor<UserModel> {
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
