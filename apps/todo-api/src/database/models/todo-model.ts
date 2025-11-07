import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';

// Database model attributes (internal representation with integer PK, FK, and UUID)
export interface TodoModelAttributes {
  id?: number; // Auto-increment BIGINT PK (optional for creation)
  uuid: string; // Public UUID identifier (CHAR(36))
  userId: number; // Integer FK to users.id (BIGINT)
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type TodoModel = Model<TodoModelAttributes>;

export function defineTodoModel(sequelize: Sequelize): ModelCtor<TodoModel> {
  return sequelize.define(
    'Todo',
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
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      completed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at',
      },
    },
    {
      tableName: 'todos',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['uuid'],
        },
        {
          fields: ['user_id'],
        },
        {
          fields: ['completed'],
        },
        {
          fields: ['user_id', 'completed'],
        },
      ],
    },
  );
}
