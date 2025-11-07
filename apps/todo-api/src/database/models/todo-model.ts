import {
  DataTypes,
  type Sequelize,
  type ModelStatic,
  type Model,
} from 'sequelize';
import { z } from 'zod';

// Zod schema for runtime validation
export const TodoModelAttributesSchema = z.object({
  id: z.number().optional(),
  uuid: z.string().uuid(),
  organizationId: z.number(),
  createdBy: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable(),
});

// Database model attributes (internal representation with integer PK, FK, and UUID)
export type TodoModelAttributes = z.infer<typeof TodoModelAttributesSchema>;

export type TodoModel = Model<TodoModelAttributes>;

export function defineTodoModel(sequelize: Sequelize): ModelStatic<TodoModel> {
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
      organizationId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: 'organization_id',
      },
      createdBy: {
        type: DataTypes.BIGINT,
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
          unique: true,
          fields: ['uuid'],
        },
        {
          fields: ['organization_id'],
        },
        {
          fields: ['created_by'],
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
