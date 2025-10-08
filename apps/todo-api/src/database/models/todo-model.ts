import {
  DataTypes,
  type Sequelize,
  type ModelCtor,
  type Model,
} from 'sequelize';
import type { Todo } from '../../todos/domain/todo-schemas.js';

export type TodoModelAttributes = Todo;

export type TodoModel = Model<TodoModelAttributes>;

export function defineTodoModel(sequelize: Sequelize): ModelCtor<TodoModel> {
  return sequelize.define(
    'Todo',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'organization_id',
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'created_by',
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
          fields: ['organization_id'],
        },
        {
          fields: ['completed'],
        },
        {
          fields: ['organization_id', 'completed'],
        },
      ],
    },
  );
}
