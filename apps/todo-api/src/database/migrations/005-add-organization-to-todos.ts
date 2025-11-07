import { DataTypes, type QueryInterface } from 'sequelize';
import type { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // Add organization_id column (nullable for migration, integer FK)
  await queryInterface.addColumn('todos', 'organization_id', {
    type: DataTypes.BIGINT,
    allowNull: true, // Nullable during migration
    references: {
      model: 'organizations',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Add created_by column (nullable for migration, integer FK)
  await queryInterface.addColumn('todos', 'created_by', {
    type: DataTypes.BIGINT,
    allowNull: true, // Nullable during migration
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Add index for organization_id
  await queryInterface.addIndex('todos', ['organization_id'], {
    name: 'todos_organization_id_index',
  });

  // Add composite index for organization_id and completed
  await queryInterface.addIndex('todos', ['organization_id', 'completed'], {
    name: 'todos_organization_id_completed_index',
  });
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // Remove indexes
  await queryInterface.removeIndex(
    'todos',
    'todos_organization_id_completed_index',
  );
  await queryInterface.removeIndex('todos', 'todos_organization_id_index');

  // Remove columns
  await queryInterface.removeColumn('todos', 'created_by');
  await queryInterface.removeColumn('todos', 'organization_id');
};
