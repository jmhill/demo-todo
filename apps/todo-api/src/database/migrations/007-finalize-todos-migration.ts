import { DataTypes, type QueryInterface } from 'sequelize';
import type { MigrationFn } from 'umzug';

export const up: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // Change organization_id to NOT NULL (integer FK)
  await queryInterface.changeColumn('todos', 'organization_id', {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Change created_by to NOT NULL (integer FK)
  await queryInterface.changeColumn('todos', 'created_by', {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Remove old user_id column (this will automatically drop associated foreign keys and indexes)
  await queryInterface.removeColumn('todos', 'user_id');
};

export const down: MigrationFn<QueryInterface> = async ({
  context: queryInterface,
}) => {
  // Re-add user_id column (integer FK)
  await queryInterface.addColumn('todos', 'user_id', {
    type: DataTypes.BIGINT,
    allowNull: true, // Nullable for rollback
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Make new columns nullable again (integer FKs)
  await queryInterface.changeColumn('todos', 'organization_id', {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  await queryInterface.changeColumn('todos', 'created_by', {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
};
